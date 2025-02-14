import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { Request, Response, RequestHandler } from 'express'

import { createUser, getUserById, getUserByEmail, updateUser, deleteUser, emailExists, comparePasswords, generateOTP, sendMail, storeOtp, compareOtp, uploadPicture, createdeliveryPartner, updatingdeliveryPartner, updatingdeliverypatnerstatus, CreateNewAddress, getDeliveryPartner, getAddresses } from './queries'

dotenv.config()



export const Register: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { full_name, password, primary_address, mobile_number, email } = req.body;
        const file = req.file;

        console.log(file, password, primary_address, mobile_number, email, full_name);

        // Validate required fields
        if (!file || !full_name || !password || !primary_address || !mobile_number || !email) {
            
            res.status(400).json({ message: 'All fields are required' });
            return
        }

        let picture: string = '';
        if (file) {
            // Process the image stored in memory
            picture = await uploadPicture(file);
        }

        // Check if email already exists
        if (await emailExists(email)) {
            res.status(400).json({ message: 'Email already in use' });
            return
        }

        // Create a new user with the provided details
        await createUser({ full_name, password, picture, primary_address, mobile_number, email });

        res.status(201).json({ message: 'User created successfully' });
        return
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating user', error: err });
        return
    }
};



export const Login: RequestHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {

        if(!email || !password) {

            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        const user = await getUserByEmail(email);
        if (!user) {
            res.json({ message: 'User not found', success: false });
            return;
        }

        const isPasswordCorrect = await comparePasswords(password, user.password);
        if (!isPasswordCorrect) {
            res.json({ message: 'Invalid password', success: false });
            return;
        }

        const token = jwt.sign({ userId: user.user_id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        res.cookie('Ecomm_token', token, {
            httpOnly: true,
            expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            sameSite: 'none',
            secure: false,
        })
        res.status(200).json({ message: 'Login successful', token,user });
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging in' });
        return;
    }
}

export const GetUser_byId:RequestHandler = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try {

        if(!userId){
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching user' });
        return;
    }
}

export const UpdateUser:RequestHandler = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { full_name, picture, primary_address, mobile_number } = req.body;

    try {
        if(!userId ||!full_name ||!primary_address ||!mobile_number){
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        await updateUser(userId, { full_name, picture, primary_address, mobile_number,  });
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating user' });
    }
}

export const DeleteUser:RequestHandler = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try {
        if(!userId){
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        await deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting user' });
    }
}

export const SendResetPasswordOtp:RequestHandler = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {

        if(!email){
            res.status(400).json({ message: 'User ID and Email are required' });
            return;
        }
        // Check if the email already exists
        // if (await emailExists(email)) {
        //     res.status(400).json({ message: 'Email already in use' });
        //     return;
        // }
        const user = await getUserByEmail(email);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userId = user.user_id;

        // Generate a random 6-digit OTP
        const otp = generateOTP(6);

        // Send the OTP via email
        await sendMail(email, 'Reset Password', otp)

        await storeOtp(userId, 1, otp);

        res.json({ message: 'OTP sent successfully' });
        return;

    } catch (err) {
        console.error();
        res.status(500).json({ message: 'Error generating otp' });
        return;
    }

}

export const CompareOtp:RequestHandler = async (req: Request, res: Response) => {
    const { otp } = req.body;
    const userId = (req as any).userId;

    try {
        if (!otp ||!userId) {
            res.status(400).json({ message: 'OTP and User ID are required' });
            return;
        }
        // Retrieve the stored OTP
        const isOtpValid = await compareOtp(otp, userId, 1);
        console.log(isOtpValid)

        if (!isOtpValid) {
            res.json({ message: 'Invalid OTP', success: isOtpValid });
            return
        }

            res.status(200).json({ message: 'Otp Match', success: isOtpValid });
            return

    } catch (err) {
        console.error();
        res.status(500).json({ message: 'Error comparing OTP' });
        return
    }
}

export const CreateAddress:RequestHandler = async(req: Request, res: Response)=>{
    const { full_name,mobile_number,address_line1,address_line2,city,state,country,pincode} = req.body;
    const userId = (req as any).userId;

    try {
        await CreateNewAddress(userId,{full_name,mobile_number,address_line1,address_line2,city,state,country,pincode})
        res.status(200).json({ message: 'address created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating address' });
    }
}

export const create_deliveryPartner:RequestHandler = async(req:Request, res:Response)=>{
    try {
        const { name, contact_number, email, vehicle_type, vehicle_number, pincode, password } = req.body;

        if(!name|| !contact_number|| !email||!vehicle_type|| !vehicle_number|| !pincode){
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        await createdeliveryPartner(name, contact_number, email, vehicle_type, vehicle_number, pincode,password);
        res.status(201).json({message : "Partner created successfully"});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating delivery partner' });
    }
}

export const login_deliveryPartner:RequestHandler = async(req:Request,res:Response) =>{
    const { email, password } = req.body;
    try {
        const hashedPassword = await getDeliveryPartner(email)
        if(!hashedPassword){
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const isPasswordValid = comparePasswords(password, hashedPassword.password);
        if(!isPasswordValid){
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const token = jwt.sign({ partnerId: hashedPassword.partner_id, email: hashedPassword.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        res.cookie('Ecomm_partner_token', token, {
            httpOnly: true,
            expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            sameSite: 'none',
            secure: true,
        })
        res.json({ message: 'Login successful', token });
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"error in login delivery partner"})
    }
}

export const update_deliveryPartner:RequestHandler = async(req:Request,res:Response)=>{
    try {
        const { name, contact_number, email, vehicle_type, vehicle_number, pincode, } = req.body;
        const partner_id = (req as any).partner_id

        if(!name|| !contact_number|| !email||!vehicle_type|| !vehicle_number|| !pincode){
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        await updatingdeliveryPartner(partner_id,name, contact_number, email, vehicle_type, vehicle_number,pincode )
        res.status(200).json({message : "Partner updated successfully"})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"error updating delivery partner"})
    }
}

export const update_deliveryPartner_status:RequestHandler = async(req:Request,res:Response)=>{
    try {
        const { availability_status } = req.body;
        const partner_id = parseInt(req.params.partner_id);

        if(!availability_status){
            res.status(400).json({ message: 'Status is required' });
            return;
        }

        await updatingdeliverypatnerstatus(partner_id, availability_status)
        res.status(200).json({message : "Partner status updated successfully"})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"error updating delivery partner status"})
    }
}

export const getallAddresses:RequestHandler = async(req:Request, res:Response)=>{
    const userId = (req as any).userId
    console.log(userId)
    try {
        const result = await getAddresses(userId);
        res.json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"error getting all addresses"})
    }
}

