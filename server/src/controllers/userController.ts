import { Request, Response } from "express";
import prisma from "../config/prisma";

interface AuthRequest extends Request{
    userId?:number;
}

export const getMe = async(
req:AuthRequest,
res:Response
)=>{

try{

const user =
await prisma.user.findUnique({

where:{
id:req.userId
},

select:{
id:true,
name:true,
email:true,
isVerified:true
}

});

res.json(user);

}catch{

res.status(500).json({
message:"Server Error"
});

}

};