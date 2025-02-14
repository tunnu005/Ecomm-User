import { Router } from "express";
import multer, {memoryStorage} from 'multer'
import { CompareOtp, create_deliveryPartner, CreateAddress, DeleteUser, getallAddresses, GetUser_byId, Login, login_deliveryPartner, Register, SendResetPasswordOtp, update_deliveryPartner, update_deliveryPartner_status, UpdateUser } from "./controller";
import { auth, authPartner } from "./middlewares";



const router:Router = Router()
const upload = multer({storage : memoryStorage()})


router.post('/register',upload.single('file'),Register) // register

router.post('/login',Login) // login

router.get('/getuser',auth,GetUser_byId) //get user by id

router.put('/updateuser',upload.single('file'),auth,UpdateUser) // update user

router.delete('/deleteuser',auth,DeleteUser) // delete user

router.post('/resetpassword/',auth,SendResetPasswordOtp) //send and store hashed otp

router.post('/compareotp/',auth,CompareOtp) // compare and fetch hashed otp

router.post('/createAddress',auth,CreateAddress) // create address

router.post('/createdeliverypartner',create_deliveryPartner) // create delivery partner

router.post('/partnerlogin',login_deliveryPartner) // login delivery partner

router.put('/updatedeliverypartner',authPartner,update_deliveryPartner) // update delivery partner

router.put('/updatestatus',authPartner,update_deliveryPartner_status) // update delivery partner status

router.get('/getaddresses',auth,getallAddresses) //get all addresses

// router.get('/example',exmaple)


export default router