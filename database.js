const { Client } = require("pg")
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "Medical Clinic",
  port: 5432,
  password: "Admin1312"
})

client.connect()
.then(() => {
  console.log("Connected to the database")
})
.catch((err) => {
  console.error("Error connecting to the database", err)
})

module.exports = {client}