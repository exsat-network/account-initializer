import express from "express";
import bodyParser from "body-parser";
const app = express();
const port = 3000;


// Middlewares
app.use(bodyParser.json());

const Mock_Data = {
  my: {
    status: "success", // !! Set this value as "error " when testing the 1st process or set it as "success" to test others.
    info: {
      username: "exsat",
      role: "validator",
      publicKey: "PUB_K1_6fyq2HD9BdweFRXHt8xAJUK7fXNNsSzBsj8xqXk9VNWif6WJQk",
      status: "comfirmed",
    },
  },
  "check-username": {
    valid: true,
  },
  "create-user": {
    status: "success",
    info: {
      btcAddress: "1KRMKfeZcmosxALVYESdPNez1AP1mEtywp",
      amount: "0.01 BTC",
    },
  },
  "users-submit-payment": {
    status: "success",
    message:
      "Transaction submitted, please check your email and  wait for confirmation",
  },
  "create-payment": {
    status: "success",
    info: {
      btcAddress: "1KRMKfeZcmosxALVYESdPNez1AP1mEtywp",
      amount: "0.01 BTC",
    },
  },
  "payments-submit-payment": {
    status: "success",
    message: "Please deposit soon, or this order will be expired in 1 hour.",
  },
};

// Routes
app.post("/api/users/my", (req, res) => {
  console.log(`info: ${req.body.publicKey}`);
  res.json(Mock_Data["my"]);
});

app.post("/api/users/check-username", (req, res) => {
  console.log(`check-username: ${req.body.username}`);
  res.json(Mock_Data["check-username"]);
});

app.post("/api/users/create-user", (req, res) => {
  console.log(`create account: `);
  console.log(req.body);

   res.json(Mock_Data["create-user"]);
});


app.post("/api/users/submit-payment", (req, res) => {
  console.log(`confirm payment: `);
  console.log(req.body);

  res.json(Mock_Data["users-submit-payment"]);
});

app.post("/api/payments/create-payment", (req, res) => {
  console.log(`create payment:`);
  console.log(req.body);

  res.json(Mock_Data["create-payment"]);
});
app.post("/api/payments/submit-payment", (req, res) => {
  console.log(`submit payment: `);
  console.log(req.body);

  res.json(Mock_Data["payments-submit-payment"]);
});

app.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
});
