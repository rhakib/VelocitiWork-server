const express = require('express')
const app = express()
const port = 5000

app.get('/', (req, res) => {
  res.send('Hello VelocitiWork-Ventures!')
})

app.listen(port, () => {
  console.log(`VelocitiWork-Ventures running on ${port}`)
})