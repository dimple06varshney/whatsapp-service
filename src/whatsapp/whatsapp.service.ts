import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { NlpManager } from "node-nlp";
import _ from "lodash";
const manager = new NlpManager({ languages: ["en"] });
// Loading our saved model
manager.load();
@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    constructor(
        private httpService: HttpService
    ) { }
    public async sendMessageAPI(payload) {
        try{
            const phone_number_id = process.env.PHONE_NO_ID;
            const token = process.env.VERIFY_TOKEN;
            console.log('sendMessageAPI -> payload ->', payload);

            let response = await this.httpService.axiosRef.post(`https://graph.facebook.com/v16.0/${phone_number_id}/messages?access_token=${token}`,
                payload, {
                headers: { "Content-Type": "application/json" }
            });
            console.log('response ---', response.data, 81);
            return response.data; 
        }catch(error){
            throw new Error(error.message);
        }
    }
    public async processRecievedMessage(payload) {        
        const messageDetails = _.get(payload, "entry[0].changes[0].value.messages[0]");
        const messageType = _.get(messageDetails, "type");
        const receivedFrom = _.get(messageDetails, "from", "NA");
        let response;   
        try{
            if (messageDetails) {
                this.logger.log(`Started processing on received message on whatsapp from ${receivedFrom} with message type is ${messageType}`);
                const msgDetails = _.get(messageDetails, messageType);
                const body = _.get(msgDetails, "body", "");
                console.log('body ---',body);
                
                console.log(msgDetails);   
                        
                if(messageType === "text") {
                     response = await manager.process("en", body);
                    console.log('response.answer from AI ----',response.answer);
                    const responseMessagePayload = {
                        messaging_product: "whatsapp",
                        to: receivedFrom,
                        type: "text",
                        text: {
                          body : response.answer
                      }
                    }
                    await this.sendMessageAPI(responseMessagePayload);
                }
                
            }
           return response.answer; 
        }catch(error){

        }
    }
    public async retrieveMedia(mediaId: string) {
        try {
            const token = process.env.VERIFY_TOKEN;
            const response = await this.httpService.axiosRef.get(`https://graph.facebook.com/v17.0/${mediaId}?access_token=${token}`);
            console.log('retrieveMedia -> response.data ->', response.data);      
            return {success: true, data: response.data};
        } catch (error) {
            console.log('retrieveMedia-> error ->', error);
            return {success: false, data: null }
        }
    }

    public async downloadMedia(url) {
        try{
            const token = process.env.VERIFY_TOKEN;
            const downloadMediaRepsonse = await this.httpService.axiosRef.get(url, { headers:  { "Authorization":`Bearer ${token}` } } );
            // console.log('downloadMedia -> response -> ', downloadMediaRepsonse );
            return { sucess: true, data: downloadMediaRepsonse.data };
        }catch(error){
            console.log('downloadMedia -> error ->', error);
            throw new Error(error.message);
        }
    }
}