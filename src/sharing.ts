
import { SharingClient, SharableApp, Jpeg, Binary} from "cc-sharing";
declare const require:(name:string) => any;
const iFramePhone = require("iframe-phone");
const uuid = require("uuid");

let firebaseImp:any = null;
const addSharingStore = function (_firebaseImp:any) {
  firebaseImp = _firebaseImp;
}

const preparePublish = function(canvas:HTMLCanvasElement, firebase:any) {
  let publishing = false
  const app:SharableApp = {
    application: () => {
      let launchUrl = window.location.href
      if (publishing && firebaseImp) {
        launchUrl = firebaseImp.createSharedUrl()
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

    }
  }
  const sharePhone = new SharingClient({app});
};

(<any>window).preparePublish = preparePublish;
(<any>window).addSharingStore = addSharingStore;
