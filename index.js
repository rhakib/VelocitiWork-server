const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

//middleware

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.opj08k2.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const usersCollection = client.db('VelocitiWork').collection('users')
    const paymentCollection = client.db('VelocitiWork').collection('payments')
    const taskCollection = client.db('VelocitiWork').collection('tasks')


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '8h'
      })
      console.log(token);
      res.send({ token })
  })

  //middlewares

  const verifyToken = (req, res, next) => {
    console.log('inside token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
    }

    const token = req.headers.authorization.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
    })

    next()

}

//use verifyAdmin after verifyToken

const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query)
    const isAdmin = user?.role === 'admin'
    if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next()
}
const verifyHR = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query)
    const isHr = user?.role === 'HR'
    if (!isHr) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next()
}



    //payment APIs

    app.post('/create-payment-intent', async (req, res) => {
      const { salary } = req.body;
      const amount = parseInt(salary * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.post('/payments', async (req, res) => {
      const payments = req.body;
      const result = await paymentCollection.insertOne(payments)
      res.send(result)

    })

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().sort({payMonth: -1}).toArray()
      res.send(result)
    })

   

    

    //apis


    app.post('/users', async (req, res) => {
      const users = req.body;
      const result = await usersCollection.insertOne(users)
      res.send(result)
    })

    app.get('/users', verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/hr/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          verified: 'yes'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })


    app.post('/tasks', async (req, res) => {
      const tasks = req.body;
      const result = await taskCollection.insertOne(tasks)
      res.send(result)
    })

    app.get('/tasks/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = {email: email}
      const result = await taskCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/tasks', async (req, res) => {    
      let queryObj = {}           
    
            const name = req.query.name;
            const date = req.query.date           

            if (name) {
                queryObj.name = name;
            }
            if (date) {
                queryObj.date = date;
            }  


            const result = await taskCollection.find(queryObj).toArray()
            res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'HR'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.put('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          fired: 'yes'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);

      if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)

      let admin = false;
      if (user) {
          admin = user?.role === 'admin'
      }
      console.log(admin);

      res.send({ admin })
  })


    app.get('/users/hr/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);

      if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)

      let hr = false;
      if (user) {
        hr = user?.role === 'HR'
      }
      console.log(hr);

      res.send({ hr })
  })

    




  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello VelocitiWork-Ventures!')
})

app.listen(port, () => {
  console.log(`VelocitiWork-Ventures running on ${port}`)
})