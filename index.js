const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 3000;
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PAS}@cluster0.zgmhkd0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const menu = client.db("bistro").collection("menu");
    const review = client.db("bistro").collection("reviews");
    const cardData = client.db('bistro').collection('card')
    const Users = client.db('bistro').collection('users')


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN);
      res.send({ token })
    })




    app.get('/menu', async (req, res) => {
      const result = await menu.find().toArray()
      res.send(result)
    })
    app.get('/review', async (req, res) => {
      const result = await review.find().toArray()
      res.send(result)
    })

    // add card api
    app.post('/card', async (req, res) => {
      const Data = req.body;
      console.log(Data)
      const result = await cardData.insertOne(Data);
      res.send(result);
    });

    app.get('/card', async (req, res) => {
      const Email = req.query.email
      const query = { email: Email };
      const result = cardData.find(query)
      const ans = await result.toArray(result)
      res.send(ans)
    })

    app.delete('/card/:id', async (req, res) => {
      const result = await cardData.deleteOne({ _id: new ObjectId(req.params.id) })
      res.send(result)
    })


    const verify = (req, res, next) => {
      console.log(req.headers)
      if (!req.headers.authorization) {
        return res.status(401).res.send({ message: "error" })
      }
      const token = req.headers.authorization
    
      jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(403).res.send({ message: 'forbid access' })
        }
    
        req.user = decoded
        next()
      })
    }

    const verifyAdmin=async(req,res,next)=>{
      const email=req.user.email;
      const filter={email:email}
      const user=await Users.findOne(filter);
      const admin=user?.role==='admin'
      if(!admin){
        return res.status(403).send({message:"forbidden access"})
      }
      next()
    }




    // website users 
    app.post('/users', async (req, res) => {

      const query = { email: req.body.email }
      const existingUser = await Users.findOne(query);
      if (existingUser) {
        return res.send({ message: 'already exit' })
      }


      const result = await Users.insertOne(req.body);
      res.send(result)
    })

    



   
      

    app.get('/users', verify, verifyAdmin, async (req, res) => {
      const result = await Users.find().toArray();
      res.send(result)
    });



    app.get('/user/:email',verify,async(req,res)=>{

      const email=req.params.email;
      if(email!==req.user.email){
        return res.status(401).send({message:'cannot access'})
      }

      const filter={email:email};
      const user=await Users.findOne(filter);
      let admin=false;
      if(user){
        admin=user?.role==='admin'
      }
      res.send({admin})

    })




    app.delete('/users/:id', async (req, res) => {
      console.log(req.params.id)
      const result = await Users.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result)
    })

    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await Users.updateOne(filter, updateDoc);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);











app.get('/', (req, res) => {
  res.send('The final project is running')
})
app.listen(port, () => {
  console.log('running')
})