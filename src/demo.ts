
import { SharingClient, SharableApp, Jpeg, Binary} from "cc-sharing";
declare const require:(name:string) => any;
const iFramePhone = require("iframe-phone");
const uuid = require("uuid");

const preparePublish = function(canvas:HTMLCanvasElement, firebase:any) {
  const app:SharableApp = {
    application: {
      launchUrl: window.location.href,
      name: "Collaborative drawing"
    },
    getDataFunc: (context) => {
      const version  = uuid.v1();
      const filename:string = `thumbnails/${context.offering}/${context.group}/${context.user}/${context.id}/${version}.jpg`;
      return new Promise( (resolve, reject) => {
        const blobSaver = (blob:Blob) => {
          if(blob) {
            firebase.saveFile(filename, blob).then((results:any) => {
                resolve(
                  [{type: Jpeg, dataUrl: results.downloadURL}]
                )
              }
            )
          }
          else {
            reject("Couldn't create firebase file from canvas blob");
          }
        }
        canvas.toBlob(blobSaver, Jpeg.type);
      });

    }
  }
  const sharePhone = new SharingClient({app});
};

(<any>window).preparePublish = preparePublish;
