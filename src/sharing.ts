
import { SharingClient, SharableApp, Jpeg, Binary, Context} from "cc-sharing";
declare const require:(name:string) => any;
const iFramePhone = require("iframe-phone");
const uuid = require("uuid");

const setupSharing = function(canvas:HTMLCanvasElement, firebase:any, done:Function) {
  let publishing = false
  const app:SharableApp = {
    application: () => {
      let launchUrl = window.location.href
      if (publishing) {
        launchUrl = firebase.createSharedUrl()
        publishing = false
      }
      return {
        launchUrl: launchUrl,
        name: "Collaborative drawing"
      }
    },
    getDataFunc: (context) => {
      publishing = true
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
    },
    initCallback: (context:Context) => {
      done(context)
    }
  }
  const sharePhone = new SharingClient({app});
};

(<any>window).setupSharing = setupSharing;

