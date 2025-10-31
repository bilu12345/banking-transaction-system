import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log("✅ Connected to MySQL database");

// Transaction Route
app.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [fromAcc] = await connection.query("SELECT balance FROM accounts WHERE name=?", [from]);
    const [toAcc] = await connection.query("SELECT balance FROM accounts WHERE name=?", [to]);

    if (!fromAcc.length || !toAcc.length) {
      throw new Error("Invalid account name!");
    }

    if (fromAcc[0].balance < amount) {
      throw new Error("Insufficient balance!");
    }

    await connection.query("UPDATE accounts SET balance = balance - ? WHERE name=?", [amount, from]);
    await connection.query("UPDATE accounts SET balance = balance + ? WHERE name=?", [amount, to]);

    await connection.commit();
    res.json({ message: "✅ Transaction Successful!" });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: `❌ Transaction Failed: ${err.message}` });
  } finally {
    connection.release();
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
