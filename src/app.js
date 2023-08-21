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

    const val = schemaUser.validate(req.body, { abortEarly: false });

	if (val.error) {
		const errors = val.error.details.map(detail => detail.message);
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

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const user = req.headers.user;

    const schemaMessage = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    })

    const val = schemaMessage.validate(req.body, { abortEarly: false });

    if(!user){
        return res.status(422).send("Não recebemos o user");
    }

    if (val.error) {
        const errors = val.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const participant = await db.collection("participants").findOne({ name: user });
        if (!participant) return res.status(422).send("Esse usuário não está na lista de participantes! Faça o Login novamente.");

        const date = dayjs();

        const hour = date.format('HH:mm:ss');

        await db.collection("messages").insertOne({ from: user, to: to, text: text, type: type, time: hour });

        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message);
    }

})

app.get("/messages", async (req, res) => {

    const limit = parseInt(req.query.limit);

    const user = req.headers.user;

    try {
        const messages = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user }
            ]
        }).toArray();

        if (limit) {
            if (typeof limit === 'number' && limit !== null && limit > 0 && Number.isInteger(limit)) {

              if (messages.length > limit) {
                messages = messages.slice(-limit);}

            } else {

              return res.status(422).send("Limite inválido. Certifique-se de que é um número inteiro positivo.");
            }
          }

        res.send(messages);

    } catch (err) {
        res.status(500).send(err.message);
    }
})


const PORT = 5000;

app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}!`));