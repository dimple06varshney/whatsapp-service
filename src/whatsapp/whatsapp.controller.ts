import { HttpService } from "@nestjs/axios";
import { Body, Controller, Get, HttpStatus, Param, Post, Req, Res } from "@nestjs/common";
import { WhatsappService } from "./whatsapp.service";
import { v4 as uuid } from 'uuid';
const _  = require("lodash");
import path from "path";
const fs = require('fs');
@Controller("whatsapp")
export class WhatsappController {

    constructor(
        private readonly httpService: HttpService,
        private readonly whatsappService: WhatsappService
    ) { }

    @Get('/webhook')
    public async verifyToken(@Req() req, @Res() res) {
        const verify_token = process.env.WEBHOOK_ACCESS_TOKEN;

        // Parse params from the webhook verification request
        let mode = req.query["hub.mode"];
        let token = req.query["hub.verify_token"];
        let challenge = req.query["hub.challenge"];

        // Check if a token and mode were sent
        if (mode && token) {
            // Check the mode and token sent are correct
            if (mode === "subscribe" && token === verify_token) {
                // Respond with 200 OK and challenge token from the request
                console.log("WEBHOOK_VERIFIED");
               return res.status(200).send(challenge);
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
               return res.status(403).send("Something went wrong!");
            }
        }
    }

    @Post('/webhook')
    public async receivedMessage(@Req() req, @Body() payload, @Res() res) {
       
        console.log('receivedMessage ->',JSON.stringify(payload, null, 2));
        await this.whatsappService.processRecievedMessage(payload);
        return res.status(HttpStatus.OK).send("EVENT_RECEIVED");
    }

    @Post("/message")
    async sendMessage(@Body() payload, @Req() req, @Res() res) {
        try {
            const response = await this.whatsappService.sendMessageAPI(payload);
            
            return res.status(HttpStatus.OK).json({ response: response });
        } catch (error) {
            console.log('error --', error.message);
            return res.status(HttpStatus.BAD_REQUEST).json({ response: error.message })
        }
    }

    @Get("retrieve-media/:mediaId")
    async media(@Req() req, @Param("mediaId") mediaId: string, @Res() res) {
        try {
            const response = await this.whatsappService.retrieveMedia(mediaId);
            if (response.success) {
                const url = response.data.url;
                const fileName = response.data.file
                const filePath = `${__dirname}/${Math.random()}.pdf`;
                console.log('filePath -> ', filePath);
                console.log('retrieve-media/:mediaId -> url-> ', url);
                const downloadMediaRepsonse = await this.whatsappService.downloadMedia(url);
                // console.log("retrieve-media/:mediaId -> downloadMediaRepsonse ->", downloadMediaRepsonse);
                if(downloadMediaRepsonse.sucess){
                    //  fs.writeFileSync(filePath, downloadMediaRepsonse.data);
                     const bufferData = Buffer.from(downloadMediaRepsonse.data, 'binary');
                     console.log('bufferData =', bufferData);
                     
                    console.log('File downloaded successfully.');
                    return res.status(HttpStatus.OK).json({message: "File Downloaded Successfully!"});
                }
            }
           return res.status(HttpStatus.OK).json({});
        } catch (error) {
           return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
        }
    }

    @Post("download-media")
    async download(@Req() req, @Res() res, @Body() payload){
        try{
            console.log("payload -> ", payload);
            const url = payload.url;  
            const response =  await this.whatsappService.downloadMedia(url);
            console.log('download-media/:url -> response ->', response.data);
            return res.status(HttpStatus.OK).json({success: true, response: response.data })
        }catch(error){
            console.log('download-media/:url -> error -> ', error);
           return res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });    
        }
    } 
}