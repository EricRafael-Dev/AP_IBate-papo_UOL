import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from 'dayjs';

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();
const client = new MongoClient(process.env.dateBASE_URL);
try {
	await client.connect();
	console.log("MongoDB conectado!");
} catch (err) {
	(err) => console.log(err.message);
}

const db = client.db();

app.get("/participants", async (req, res) => {
	try {
		const participants = await db.collection("participants").find().toArray();
		res.send(participants);
	} catch (err) {
		res.status(500).send(err.message)
	}
})

app.post("/participants", async(req,res) => {
    const { name } = req.body;

    const schemaUser = Joi.object({
        name: Joi.string().required()
	})

    const validation = schemaUser.validate(req.body, { abortEarly: false });

	if (validation.error) {
		const errors = validation.error.details.map(detail => detail.message);
		return res.status(422).send(errors);
	}

    try{
        const user = await db.collection("participants").findOne({ name: name });
        if (user) return res.status(409).send("Esse usuário já existe!");

        await db.collection("participants").insertOne({name: req.body.name, lastStatus: Date.now()});

        const date = dayjs();

        const hour = date.format('HH:mm:ss');

        await db.collection("messages").insertOne({from: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hour});

		res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message);
    }

})



const PORT = 5000;

app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}!`));