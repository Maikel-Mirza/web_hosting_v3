const HTTP_PORT = process.env.PORT || 8080;
const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const multer = require("multer");
const upload = multer();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');


mongoose.connect('mongodb+srv://Maikel777:Ls73v3n777@senecaweb.e4z9x6f.mongodb.net/web322?retryWrites=true&w=majority');
 
const app = express();
app.use(express.static("static"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function onHttpStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
}

//i had some trouble with this
//var User = new mongoose.model('users',userSchema);
//var Article = new mongoose.model('articles',articleSchema);
//var Comment = new mongoose.model('comments',commentSchema);


// setup a 'route' to listen on the default url path (http://localhost)
// Render index.hbs (main route)
app.get('/', (req, res) => res.redirect('/home'))

app.get('/home', (req, res) => {
    res.render('index');
})

const userSchema = new Schema({
    "userName": {
        "type": String,
        "unique":true
    },
    "firstName": String,
    "lastName": String,
    "email": {
        "type": String,
        "unique":true
    },
    "phone": String,
    "address": String,
    "addressLine2":String,
    "city":String,
    "province":String,
    "postal":String,
    "country":String,
    "passHash":String,
    "isAdmin":{
        "type":Boolean,
        "default":false
    }
});

const articleSchema = new Schema({
    "headline": String,
    "content": String,
    "date":Date,
    "author":String,
    "image_path":{
        "type":String,
        "default":"/resources/dumbledoor.jpg"
    }
});

const commentSchema = new Schema({
    "articleID" : String,
    "name" : {
        "type": String,
        "default": 'Anonymous'
    },
    "email" : String,
    "comment" : String,
    "date" : Date
});


app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");

app.get("/login", (req,res) => {
    res.render('login', {title:'Web Hosting Unlimited'});
});

app.post("/login-user", upload.none(), (req, res) => {
    const data = req.body;
    if (data.username && data.password){
        User.findOne({userName:data.username}).exec().then((user) => {
            if (user){
                bcrypt.compare(data.password,user.passHash).then((matches) => {
                    if (matches)
                    {
                        res.json({success:true,username:data.username,password:data.password});
                    }
                    else res.json({error :"password", error_msg:"Password incorrect."})
                });
            } 
            else res.json({error :"username", error_msg:"No account found with this username."})
        });
    } else
        res.json({error: "missing_vals", error_msg:"Please fill in username and password."});
});

app.get("/dashboard", (req, res) =>{
    res.render('dashboard');
});

app.post("/dashboard", upload.none(), (req, res) =>{
    const data = req.body;
    if (data.username && data.password){
        User.findOne({userName:data.username}).lean().exec().then((user) => {
            if (user){
                bcrypt.compare(data.password,user.passHash).then((matches) => {
                    if (matches) {
                        let data = {user:user};
                        if (user.isAdmin) {
                            User.find().lean().exec().then((users) => {
                                    data['users'] = users;
                                    res.render('dashboard',data);
                            });
                        }
                        else
                            res.render('dashboard',data);
                    }
                });
            } 
            else res.status(401).send('Access Denied - User not found');
        });
    } else res.status(401).send('Access Denied - Missing username and/or password');
});

app.get("/registration", (req,res) => {
    res.render('registration');
});

app.post("/register-user", upload.none(), (req,res) =>{
    const data = req.body;
    const formVals = [ data.username, data.firstName, data.lastName, data.email, data.phone, data.address, data.city,data.province,data.postal,data.country,data.password,data.password2 ];
    
    if (formVals.some(x=>!x))
    {
        res.json({error: "missing_vals", error_msg:"Please fill in all required fields."});
    }
    else {
        const phonePattern = /([0-9]{3}-){2}[0-9]{4}/;
        const passPatterns = [/[!?<>!@#$%^&*]/, /.{8}/, /[0-9]/];

        let passMatch = passPatterns.every(x=>x.test(data.password));
        
        if (!phonePattern.test(data.phone)) 
            res.json({error:"phone",error_msg:"Phone format must be like: 123-456-7890"});
        else if (!passMatch) 
            res.json({error:"password",error_msg:"Password must contain at least: 8 characters, 1 number, and 1 symbol (!?<>!@#$%^&*)"});
        else if (data.password != data.password2)
            res.json({error:"password",error_msg:"Both password fields must match."});
        else{
            User.findOne({$or:[{email:data.email},{userName:data.username}]}).exec().then((user)=>{
                if (user)
                {
                    if (user.userName == data.username)
                        res.json({error:"username",error_msg:"There is already an account with this username."});
                    else              
                        res.json({error:"email",error_msg:"There is already an account associated with this email."});      
                }
                else 
                {
                    bcrypt.hash(data.password,12).then((hash)=>{
                        let user = new User({
                            userName:data.username,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            email:data.email,
                            phone:data.phone,
                            address:data.address,
                            addressLine2:data.address2,
                            city:data.city,
                            province:data.province,
                            postal:data.postal,
                            country:data.country,
                            passHash:hash
                        });
                        user.save().then(() => {
                            let returnData = {success:true,username:data.username,password:data.password};
                            res.json(returnData);
                        });
                    });
                    
                }
            });
        }
    }
});

app.get("/blog", (req,res) => {
    res.render('blog');
});

app.get("/read_more", (req,res) => {
    res.render('read_more');
});


app.get("/article/:id", (req,res) => {
    res.render('read_more');
});


app.post("/comment", upload.none(), (req,res) => {
    const data = req.body;
    console.log(data);
    if (data.comment && data.email && data.articleID){
        Article.findOne({_id:data.articleID}).exec().then((article)=>{
            if (article){
                if (data.name == '') data.name = undefined;
                new Comment({
                    comment: data.comment,
                    email: data.email,
                    name: data.name,
                    date: Date.now(),
                    articleID: article._id
                }).save().then(()=>{
                    res.status(200);
                });
            } else res.status(400);
        });
        
    }

});


app.listen(HTTP_PORT, onHttpStart);