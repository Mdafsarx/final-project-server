const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser');
const app = express()
const port = process.env.PORT || 3000;
const stripe = require("stripe")('sk_test_51PL0IQA3UvLG1lBCuUovljhHFdpOC8XNpGQ08lUb3bqxyeDa54HZ3ZHEyopWkSYN26ytUN5ObMwelsqLAyRfEACX002YB1Rrui');
app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { default: axios } = require('axios');
const mailgun = new Mailgun(formData);
const mg = mailgun.client(
  {
    username: 'api',
    key: process.env.MAILGUN_API_KEY
  });


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


    const verify = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "error" })
      }
      const token = req.headers.authorization

      jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'forbid access' })
        }

        req.user = decoded
        next()
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const filter = { email: email }
      const user = await Users.findOne(filter);
      const admin = user?.role === 'admin'
      if (!admin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }

    const menu = client.db("bistro").collection("menu");
    const review = client.db("bistro").collection("reviews");
    const cardData = client.db('bistro').collection('card')
    const Users = client.db('bistro').collection('users')
    const payment = client.db('bistro').collection('payments')
    const payment2 = client.db('bistro').collection('payments2')











    // payment history 
    app.post('/payment', async (req, res) => {
      const result = await payment.insertOne(req.body)
      const query = {
        _id: {
          $in: req.body.cardId?.map(i => new ObjectId(i))
        }
      }
      const deleteResult = await cardData.deleteMany(query)


      // mail send
      mg.messages.create('sandbox7374a0950d3b4f4f86f3e2b2f8c9a874.mailgun.org', {
        from: "Mailgun Sandbox <Postmaster@sandbox7374a0950d3b4f4f86f3e2b2f8c9a874.mailgun.org>",
        to: ["mdafsar99009@gmail.com"],
        subject: "bistro boss",
        text: "Testing some Mailgun awesomeness!",
        html: `<h1>Your transId ${req.body.tId} </h1>`
      })
        .then(msg => console.log(msg))
        .catch(err => console.log(err));




      res.send({ result, deleteResult })
    })






















    app.get('/payment/:email', verify, async (req, res) => {
      if (req.params.email !== req.user.email) {
        return res.status(401).send({ message: 'unAuth' })
      }
      const result = await payment.find({ email: req.params.email }).toArray();
      res.send(result)
    })


    // stripe payment method 
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(price * 100),
        currency: "usd",
        payment_method_types: [
          "card",
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });



    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN);
      res.send({ token })
    })


    app.get('/menu', async (req, res) => {
      const result = await menu.find().toArray()
      res.send(result)
    })

    app.get('/menu/:id', async (req, res) => {
      const result = await menu.findOne({ _id: req.params.id })
      res.send(result)
    })

    app.post('/menu', verify, verifyAdmin, async (req, res) => {
      const result = await menu.insertOne(req.body);
      res.send(result)
      console.log(result)
    })

    app.put('/menu/:id', async (req, res) => {
      const item = req.body;
      const updateDoc = {
        $set: {
          image: item.image,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          name: item.name,
        }
      }
      const result = await menu.updateOne({ _id: req.params.id }, updateDoc)
      res.send(result);
    })


    app.delete('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: id }
      const result = await menu.deleteOne(filter);
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

    app.get('/user/:email', verify, async (req, res) => {

      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(401).send({ message: 'cannot access' })
      }

      const filter = { email: email };
      const user = await Users.findOne(filter);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })

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

    // admin stats
    app.get('/admin-stats', async (req, res) => {
      const users = await Users.estimatedDocumentCount();
      const menuItem = await menu.estimatedDocumentCount();
      const orders = await payment.estimatedDocumentCount();

      //  const payments=await payment.find().toArray()
      //  const revenue=payments.reduce((p,c)=>p+c.price,0)

      const result = await payment.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$price"
            }
          }
        }
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItem,
        orders,
        revenue
      })
    })

    // order-stats

    app.get('/order-stats', async (req, res) => {

      const result = await payment.aggregate([
        {
          $unwind: '$menuId'
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'menuId',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $unwind: '$menuItems'
        },
        {
          $group: {
            _id: '$menuItems.category',
            quantity: { $sum: 1 },
            revenue: { $sum: '$menuItems.price' }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            quantity: '$quantity',
            revenue: '$revenue'
          }
        }
      ]).toArray()

      res.send(result)

    })

    //////////////////////////////





    // ssl commerce payment 
    app.post('/create-payment', async (req, res) => {
      const tId = new ObjectId().toString();
      const Data =
      {
        store_id: 'onebu66721aa9a1773',
        store_passwd: 'onebu66721aa9a1773@ssl',
        total_amount: '100',
        currency: 'BDT',
        tran_id: tId,
        success_url: 'http://localhost:3000/successful-payment',
        fail_url: 'http://localhost:3000/fail',
        cancel_url: 'http://localhost:3000/cancel',
        product_name: 'laptop',
        product_category: 'genaral',
        product_profile: 'shopping',
        cus_name: 'Customer Name',
        cus_email: 'cust@yahoo.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        shipping_method: 'NO',
        multi_card_name: 'mastercard,visacard,amexcard',
        value_a: 'ref001_A',
        value_b: 'ref002_B',
        value_c: 'ref003_C',
        value_d: 'ref004_D'
      }

      const response = await axios({
        method: 'post',
        url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
        data: Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      const save = await payment2.insertOne({
        status: 'pending',
        price: 100,
        tran_id: tId
      })


      if (save) {
        res.send({ paymentURl: response.data.GatewayPageURL })
      }
    })

    app.post('/successful-payment', async (req, res) => {

      if (req.body?.status !== 'VALID') {
        throw new Error('invalid payment')
      }

      // update the database 
      const filter = { tran_id: req.body.tran_id }
      const updateDoc = {
        $set: {
          status: 'success'
        }
      }
      const result = await payment2.updateOne(filter, updateDoc);
      res.redirect('http://localhost:5173/success')

    })


    
    app.post('/fail', async (req, res) => {
      res.redirect('http://localhost:5173/Fail')
    })

    app.post('/cancel', async (req, res) => {
      res.redirect('http://localhost:5173/cancel')
    })

    







    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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