import {Client, Message, User, Attachment} from "discord.js"
import * as WebRequest from 'web-request';
import {Buffer} from 'buffer';
import * as env from "dotenv";

env.load();

var bot = new Client();

const cmd = "!mtg";

bot.on('message', (msg: Message) => {
    if ( msg.content.startsWith(cmd) ) {
        respondToRequest(msg);
    }
});

bot.on("ready", () => {
    console.log("Bot logged in!");
});

bot.login(process.env.discord_api_token);


class ApiCard {
    public name: string;
    public image: string;
    public details: string;

    constructor(params: any ) {
        this.name = params.name;
        this.image = params.image_uris.small || '';
        this.details = params.uri
    }
}

class CardList {
    private cards: ApiCard[] = [];

    constructor(list: ApiCard[]) {
        this.cards = list;
    }

    public toSlice(): Array<Array<string>> {
        let msg = '';
        let cnt = 0;
        let result: Array<Array<string>> = [];
        let row: Array<string> = [];
        let i = 1;
        this.cards.forEach((card: ApiCard) => {
            msg += card.name + ': ' + card.details + "\r\n";
            msg += card.image + "\r\n";
            cnt = msg.length;
            i++;
            if ( cnt > 1800 || i >= this.cards.length ) {
                result.push(row);
                cnt = 0;
                row = [];
                msg = '';
                msg += card.name + ': ' + card.details + "\r\n";
                msg += card.image + "\r\n";
                row.push(msg);
                return false;
            } else {
                row.push(msg);
            }
        });
        return result;
    }

    public toMessage(): string {
        let msg = '';
        this.cards.forEach((element: ApiCard) => {
            msg += element.name + ': ' + element.details + "\r\n";
            msg += element.image + "\r\n";
        });
        console.log(msg);
        return msg;
    }

    public length(): number {
        return this.cards.length;
    }
}


function respondToRequest(msg: Message): void {
    let card_name = msg.content.replace(cmd, '').trimLeft();
    if ( card_name == "help" ) {
        outputHelpMessage(msg);
    } else {
        getCards(card_name).then( (data: CardList) => {
            msg.reply("I found " + data.length() + " cards!");
            let response = data.toMessage();
            if ( response.length > 2000 ) {
                data.toSlice().forEach( (list: Array<string> ) => {
                    console.log(list.join("\r\n"));
                    msg.reply(list.join("\r\n"));
                });
            } else {
                msg.reply(response);
            }
        }).catch( (e: Error) => {
            console.log(e.message);
            msg.reply("Hmmm...I couldn't find any result for your search.");
        });
    }
}


function outputHelpMessage(msg: Message): void {
    let help_msg = "";
    msg.reply(help_msg);
}

function getCards(search_string: String): Promise<CardList> {
    if ( ! search_string.endsWith('"') ) { search_string = search_string + '"'; }
    if ( ! search_string.startsWith('"') ) { search_string = '"' + search_string; }
    let uri = "https://api.scryfall.com/cards/search?q=" + search_string;
    console.log(uri);

    return queryApi(uri).then((data) => {
        let cards: ApiCard[] = [];
        data.forEach((element: any) => {
            if ( element.hasOwnProperty('card_faces') ) {
                let list: string[] = [];
                element.image_uris = { small : '' };
                element.card_faces.forEach( (object: any) => {
                    list.push(object.image_uris.small);
                });
                
                element.image_uris.small = list.join('\r\n');
            }
            cards.push(new ApiCard(element));
        });
        return new CardList(cards);
    });
}

async function queryApi(uri: string): Promise<{}[]> {
    let data = await WebRequest.json<any>(uri);
    return data.data;
}
