import express from'express';
import authRouter from './routes/authRoute.js'
const app = expresss(); 


const PORT =3000

app.use(express.json);
app.use('/',authRoute);

app.listen(PORT,()=>{
    console.log("server running!!!")
});
