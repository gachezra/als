import request from "request";
import 'dotenv/config'
import {getTimestamp} from "../Utils/utils.timestamp.js";
import ngrok from 'ngrok'

// @desc initiate stk push
// @method POST
// @route /stkPush
// @access public
export const initiateSTKPush = async(req, res) => {
    try{

        const {amount, phone, Order_ID} = req.body
        const url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        const auth = "Bearer " + req.safaricom_access_token

        const timestamp = getTimestamp()
        //shortcode + passkey + timestamp
        const password = new Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString('base64')
        // create callback url
        const callback_url = `${process.env.CALLBACK_URL}`


        console.log("callback ",callback_url)
        request(
            {
                url: url,
                method: "POST",
                headers: {
                    "Authorization": auth
                },
                json: {
                    "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                    "Password": password,
                    "Timestamp": timestamp,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": amount,
                    "PartyA": phone,
                    "PartyB": process.env.BUSINESS_SHORT_CODE,
                    "PhoneNumber": phone,
                    "CallBackURL": `${callback_url}/api/transactions/mpesaCallback/${Order_ID}`,
                    "AccountReference": "Account deposit",
                    "TransactionDesc": "Online depo"
                }
            },
            function (e, response, body) {
                if (e) {
                    console.error(e)
                    res.status(503).send({
                        message:"Error with the stk push",
                        error : e
                    })
                } else {
                    res.status(200).json(body)
                }
            }
        )
    }catch (e) {
        console.error("Error while trying to create LipaNaMpesa details",e)
        res.status(503).send({
            message:"Something went wrong while trying to create LipaNaMpesa details. Contact admin",
            error : e
        })
    }
}

// @desc Check from safaricom servers the status of a transaction
// @method GET
// @route /confirmPayment/:CheckoutRequestID
// @access public
export const confirmPayment = async(req, res) => {
    try{


        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        const auth = "Bearer " + req.safaricom_access_token

        const timestamp = getTimestamp()
        //shortcode + passkey + timestamp
        const password = new Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString('base64')


        request(
            {
                url: url,
                method: "POST",
                headers: {
                    "Authorization": auth
                },
                json: {
                    "BusinessShortCode":process.env.BUSINESS_SHORT_CODE,
                    "Password": password,
                    "Timestamp": timestamp,
                    "CheckoutRequestID": req.params.CheckoutRequestID,

                }
            },
            function (error, response, body) {
                if (error) {
                    console.log(error)
                    res.status(503).send({
                        message:"Something went wrong while trying to create LipaNaMpesa details. Contact admin",
                        error : error
                    })
                } else {
                    res.status(200).json(body)
                }
            }
        )
    }catch (e) {
        console.error("Error while trying to create LipaNaMpesa details",e)
        res.status(503).send({
            message:"Something went wrong while trying to create LipaNaMpesa details. Contact admin",
            error : e
        })
    }
}



// @desc Initiate Mpesa Business to Customer (B2C) transaction
// @method POST
// @route /b2cTransaction
// @access public
export const initiateB2CTransaction = async (req, res) => {
    try {
        const { amount, phone, remarks } = req.body;
        const { userId } = req.params;
        const url = "https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
        const auth = "Bearer " + req.safaricom_access_token;

        const commandID = "BusinessPayment"; // Other options: SalaryPayment, PromotionPayment
        const initiatorName = `${process.env.INITIATOR_NAME}`;
        const securityCredential = `${process.env.SECURITY_CREDENTIAL}`;

        request(
            {
                url: url,
                method: "POST",
                headers: {
                    "Authorization": auth
                },
                json: {
                    "InitiatorName": initiatorName,
                    "SecurityCredential": securityCredential,
                    "CommandID": commandID,
                    "Amount": amount,
                    "PartyA": process.env.BUSINESS_SHORT_CODE,
                    "PartyB": phone,
                    "Remarks": remarks,
                    "QueueTimeOutURL": `${process.env.CALLBACK_BASE_URL}/api/transactions/b2cTimeout`,
                    "ResultURL": `${process.env.CALLBACK_BASE_URL}/api/transactions/mpesaCallback/${userId}`,
                    "Occasion": "Payment"
                }
            },
            function (error, response, body) {
                if (error) {
                    console.error(error);
                    res.status(503).send({
                        message: "Error with the B2C transaction",
                        error: error
                    });
                } else {
                    res.status(200).json(body);
                }
            }
        );
    } catch (e) {
        console.error("Error while trying to initiate B2C transaction", e);
        res.status(503).send({
            message: "Something went wrong while trying to initiate B2C transaction. Contact admin",
            error: e
        });
    }
};