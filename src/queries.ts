import { pool as client } from "./dbconnection";
import bcrypt from "bcryptjs";
import nodemailer from 'nodemailer'
import cloudinary from "./cloudinary";
import { checkUser, getCoordinates } from "./utilities";
import crypto from 'crypto';

interface User {
  user_id: number,
  full_name: string,
  password: string,
  picture: string,
  primary_address: string,
  mobile_number: string,
  email: string,
  role: string,

}

interface Partner {
  partner_id: number,
  name: string,
  contact_number: string,
  email: string,
  vehicle_type: string,
  vehicle_number: string,
  availability_status : string,
  password: string,
  last_assigned_order: number,
  pincode: string,
}

interface adddress {
  address_id:number,
  user_id:number,
  full_name:string,
  mobile_number:string,
  address_line1: string,
  address_line2: string,
  city: string,
  state: string,
  country: string,
  pincode: string,
  latitude: number,
  longitude: number,

}
//upload picture
export const uploadPicture = async(picture: Express.Multer.File) => {
    const result = await cloudinary.uploader.upload(picture.path, {
        folder: 'user-pictures',
        width: 200,
        height: 200,
        crop: 'fill',
    });
    return result.secure_url;
}

// Create a new user
export const createUser =async(user: { full_name: string, password: string, picture: string, primary_address: string, mobile_number: string, email: string,  }):Promise<void> =>{
  if (!user.password) {
    throw new Error('Password is required');
}
const hashedPassword = await bcrypt.hash(user.password, 10); // 10 is the number of salt rounds

    const query = `
        INSERT INTO "users" ( "full_name", "password", "picture", "primary_address", "mobile_number", "email")
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [user.full_name, hashedPassword, user.picture, user.primary_address, user.mobile_number, user.email];
    await client.query(query, values);
}

// Fetch a user by ID
export const getUserById = async (userId: number): Promise<JSON | null> => {
  try {
      const query = 'SELECT * FROM "users" WHERE "user_id" = $1';
      const result = await client.query(query, [userId]);
      if (result.rows.length === 0) {
          return null;  // Return null if no user is found
      }
      return result.rows[0];  // Return the first user (should be unique)
  } catch (err) {
      console.error('Error fetching user:', err);
      throw new Error('Error fetching user');  // Handle the error accordingly
  }
};

// Fetch a user by Email (for login)
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
      const query = 'SELECT * FROM "users" WHERE "email" = $1';
      const result = await client.query(query, [email]);

      if (result.rows.length === 0) {
          return null;  // Return null if no user is found with the email
      }

      return result.rows[0];  // Return the first user (should be unique)
  } catch (err) {
      console.error('Error fetching user by email:', err);
      throw new Error('Error fetching user by email');  // Handle the error accordingly
  }
};


// Update user information
export const updateUser = async (userId: number, user: { full_name: string, picture: string, primary_address: string, mobile_number: string, }): Promise<boolean> => {
  try {
      // Check if user exists
     
      
      await checkUser(userId);

      // Update user details
      const query = `
          UPDATE "users"
          SET "full_name" = $2, "picture" = $3, "primary_address" = $4, "mobile_number" = $5,
          WHERE "user_id" = $1
      `;
      const values = [userId, user.full_name, user.picture, user.primary_address, user.mobile_number,];
      
      const result = await client.query(query, values);

      // If no rows were updated, return false
      if (result.rowCount === 0) {
          return false;  // No rows updated
      }

      return true;  // Successful update
  } catch (err) {
      console.error('Error updating user:', err);
      throw new Error('Error updating user');
  }
};


// Delete a user by ID
export const deleteUser = async (userId: number): Promise<void> => {
  const clients = await client.connect();
  try {
     // Check if the user exists
     await checkUser(userId);

     // Begin the transaction to ensure atomicity
     await clients.query('BEGIN');
     
     // Perform the delete operation
     const query = 'DELETE FROM "users" WHERE "user_id" = $1';
     await clients.query(query, [userId]);

     // Commit the transaction
     await clients.query('COMMIT');
  } catch (error) {
     // In case of error, roll back the transaction
     await clients.query('ROLLBACK');
     console.error(error);
     throw new Error('Error deleting user');
  } finally {
     // Release the client connection back to the pool
     clients.release();
  }
};

// Check if email exists
export const emailExists = async (email: string): Promise<boolean> => {
  try {
     const query = 'SELECT COUNT(*) FROM "users" WHERE "email" = $1';
     const result = await client.query(query, [email]);
     const count = parseInt(result.rows[0].count, 10); // Safely parse the count
     return count > 0;
  } catch (error) {
     console.error('Error checking email existence:', error);
     throw new Error('Error checking email existence');
  }
};

// Compare passwords (for login)
export const comparePasswords = (plainPassword: string, hashedPassword: string) => {
    return bcrypt.compare(plainPassword, hashedPassword);
}

// Generate OTP
export const generateOTP = (length: number = 6): string => {
  const otp = crypto.randomBytes(length).toString('hex').slice(0, length).padStart(length, '0');
  return otp;
}

// Store OTP in the database
export const storeOtp = async (userId: number, otpType: number, code: string): Promise<void> => {
  try {
      const hashOtp = await bcrypt.hash(code, 10);
      const query = 'INSERT INTO "otp"("user_id", "type_id", "code", "expired_at") VALUES ($1, $2, $3, $4)';
      const values = [userId, otpType, hashOtp, new Date(Date.now() + 5 * 60 * 1000)];

      await client.query(query, values);
  } catch (error) {
      console.error('Error storing OTP:', error);
      throw new Error('Error storing OTP');
  }
}

// Send email
export const sendMail = async (to: string, subject: string, text: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD,
      },
  });

  const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to,
      subject,
      text,
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
  } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Error sending email');
  }
}

// Compare OTP
export const compareOtp = async (code: string, userId: number, otpType: number): Promise<boolean> => {
  try {
      const query = `
          SELECT "code", "expired_at" 
          FROM "otp" 
          WHERE "user_id" = $1 AND "type_id" = $2 AND "expired_at" > NOW()
      `;
      const result = await client.query(query, [userId, otpType]);

      // If no OTP is found or it's expired
      if (result.rows.length === 0) {
          console.log('OTP not found or expired')
          return false; 
      }

      const storedOtpHash = result.rows[0].code;
      const expirationTime = result.rows[0].expired_at;

      // Compare the provided OTP with the stored hash
      const isOtpValid = await bcrypt.compare(code, storedOtpHash);

      if (!isOtpValid) {
          return false;
      }

      return true; // OTP is valid and not expired
  } catch (error) {
      console.error('Error comparing OTP:', error);
      throw new Error('Error verifying OTP');
  }
}

// create a new address
export const CreateNewAddress =async(userId:number,address : {full_name:string,mobile_number:string,address_line1:string,address_line2:string,city:string,state:string,country:string,pincode:string}):Promise<void> =>{
  try {

    await checkUser(userId);


    const query =  `
    INSERT INTO "address" 
    ("user_id", "full_name", "mobile_number", "address_line1", "address_line2", "city", "state", "country", "pincode","latitude","longitude")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    const Combaddress = address.city + ", " + address.state + ", " + address.country + "," + address.pincode + ".";
    console.log(Combaddress)
    const coordinates = await getCoordinates(Combaddress)
    const values = [userId, address.full_name, address.mobile_number, address.address_line1, address.address_line2, address.city, address.state, address.country, address.pincode, coordinates?.latitude, coordinates?.longitude];

  await client.query(query, values);
  } catch (error) {
    console.log('Error creating new address',error);
    throw new Error('Error creating new address');
  }
  
}

//get address
export const getAddresses = async(userId: number):Promise<adddress[] | []>=>{

  try {

    await checkUser(userId);

    const query =  `
    SELECT * FROM "address" WHERE "user_id" = $1
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.log(error);
    throw new Error('Error getting new address');
  }
}

// update address
export const UpdateAddress = async(addressId: number, address : {full_name:string,Mobile_number:string,address_line1:string,address_line2:string,city:string,state:string,country:string,pincode:string}):Promise<void> =>{

    try {

      const checkaddressuery = `select * from "address" where address_id = ${addressId}`
      const result = await client.query(checkaddressuery);
      if(result.rows.length === 0){
        throw new Error("Address not found");
      }

      const query =  `
    UPDATE "address" 
    SET "full_name" = $1, "mobile_number" = $2, "address_line1" = $3, "address_line2" = $4, "city" = $5, "state" = $6, "country" = $7, "pincode" = $8
    WHERE "address_id" = $9
    `;

    const values = [address.full_name, address.Mobile_number, address.address_line1, address.address_line2, address.city, address.state, address.country, address.pincode, addressId];
    await client.query(query, values);
    } catch (error) {
      console.log("error updating addres",error);
      throw new Error("Error updating address");
    }
}


export const createdeliveryPartner = async(name:string,contact_number:string,email:string,vehicle_type:string,vehicle_number:string,pincode:string,password:string)=>{
  try {
    const hashedPassword = bcrypt.hash(password,10)
    const query = `
    INSERT INTO "delivery_partners" 
    ("name", "contact_number", "email", "vehicle_type", "vehicle_number", "pincode","availability_status","password")
    VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
    `;

    const values = [name, contact_number, email, vehicle_type, vehicle_number, pincode,'not available',hashedPassword];

    await client.query(query, values);
  } catch (error) {
    console.error(error)
    throw new Error("Error creating delivery partner");
  }
}

export const getDeliveryPartner = async(email:string):Promise<Partner> =>{
  try {
    const query = `
    SELECT * FROM "delivery_partners" WHERE "email" = $1
    `;

    const result = await client.query(query, [email]);
    if(result.rows.length === 0){
      throw new Error("Delivery partner not found");
    }
    return result.rows[0]
  } catch (error) {
    throw new Error("Error creating delivery partner")
  }
}

export const updatingdeliveryPartner = async(partner_id:number,name:string,contact_number:string,email:string,vehicle_type:string,vehicle_number:string,pincode:string)=>{
  try {
    const query = `
    UPDATE "delivery_partners" 
    SET "name" = $1, "contact_number" = $2, "email" = $3, "vehicle_type" = $4, "vehicle_number" = $5, "pincode" = $6
    WHERE "partner_id" = $7
    `;

    const values = [name, contact_number, email, vehicle_type, vehicle_number, pincode,partner_id];

    await client.query(query, values);
  } catch (error) {
    console.error(error)
    throw new Error("Error updating delivery partner");
  }
}

export const updatingdeliverypatnerstatus = async(partner_id:number,availability_status:string)=>{
  try {
    const query = `
    UPDATE "delivery_partners" 
    SET "availability_status" = $1
    WHERE "partner_id" = $2
    `;

    const values = [availability_status, partner_id];

    await client.query(query, values);
  } catch (error) {
    console.error(error)
    throw new Error("Error updating delivery partner status");
  }
}