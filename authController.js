import fs from 'fs';
const app= require("express");
const path=require("path");
app.get("/signup",(req,res)=>{
    res.sendFile(__dirname ,"AIP-10-TEAM","form.html");
    
})
export const users=(req,res) =>{
  const { name,password} = req.body;
  const users = JSON.parse(fs.readFilesync("./users.json","utf-8"));
  const user = users.find(user=>user.name === name && user.password === password);

if (!user){
    return res.status(404).json({message: "user not found"});
}

if (user.password !== password){
    return res.status(400).json({message:"invalid password"});
}

res.json({
message:"login successful",
user,
})
};