import {Client, Message, User, Attachment} from "discord.js"
import * as WebRequest from 'web-request';
import {Buffer} from 'buffer';
import * as env from "dotenv";

env.load();

var bot = new Client();

class TemplateData {
    create_time: Date = new Date();
    data: string = "";
    init: boolean = true;
}

const templateData = new TemplateData();

// Log a message once login succeeds
bot.on("ready", () => {
    console.log("Bot logged in!");
});

bot.on("message", (message: Message) => {
    if ( message.content.startsWith("!meme") ) {
        if ( message.content == "!meme help" ) {
            message.reply(botHelp());
        } else if ( message.content == "!meme templates" ) {
            templatesResponse(message.author);
        }
        else {
            memeResponse(message);
        }
    }
});

bot.login(process.env.discord_api_token);


function botHelp() {
    return "You can build a meme with a single command. First, begin by selecting a template. To see a list of templates, use !meme templates.\r\n " +
    " After you've selected a template, type your top text and bottom text, separated by / . You can use _'s or camelcase to insert proper spacing\r\n" +
    "examples: !meme sb/makes_a_cool_tool/makesItReallyHardToUse";
}

async function getTemplates(): Promise<string> {
    let d = '';
    let options = { uri: "https://memegen.link/api/templates/" ,json: true }
    let data = await WebRequest.json<any>(options.uri);
    for ( let property in data ) {
        if (data.hasOwnProperty(property) ) {
            d += data[property].split('/').pop() + "\t, "+property+"\r\n";
        }
    }
    return d;
}

/**
 * Send the message
 * @param user The user to send to
 */
function sendTemplatesToUser(user: User): void {
    user.send("Here is a list of templates",
        new Attachment(Buffer.from(templateData.data, 'utf8'), 'templates.txt')
    );
}

/**
 * templatesReponse
 * A wrapper to managed template data and control flow
 * @param user The user to send the message to
 */
function templatesResponse(user: User): void {
    let now = new Date().getDate() / 1000;

    if ( now - (templateData.create_time.getDate()/1000) >  604_800 || templateData.init) {
        getTemplates().then((data) => {
            templateData.data = data;
            sendTemplatesToUser(user);
        });
        templateData.init = false;
    } else {
        sendTemplatesToUser(user);
    }
}

function memeResponse(message: Message): void {
    let regex = /\!meme /;
    let link = "https://memegen.link/" + message.content.replace(regex, '')

    getMeme(link)
    .then((data) => {
        message.reply(data);
    })
    .catch((e) => {
        message.reply("Hmmm....Something went wrong with your syntax " + message.author.username + ". Try reading the help section. !meme help");
    });
}

async function getMeme(uri: string): Promise<string> {
    let options = { uri: uri ,json: true }
    let data = await WebRequest.json<any>(options.uri);
    return data.direct.visible;
}