/**
 * Created by SpiritLing
 * github: https://github.com/SpiritLing
 * Modified by SiraisiSatoru
 * github: https://github.com/siraisisatoru
 */

"use strict";

const defaultOptions = require("./config");
const utils = require("./utils");
const svg2png = require("svg2png");
// const minimatch = require("minimatch");
const fs = require("fs-extra");
const GifUtil = require("gifwrap").GifUtil;
const StaticImageRender = require("./render/static");
// const DynamicImageRender = require("./render/dynamic");
const { setImageCache, GetImageCache, GeneralCacheFilePath } = require("./utils/cache");
const IsEqual = require("./utils/isEqual");
const path = require("path");
const md5 = require("js-md5");
const sharp = require("sharp");

/*
assign image function
*/

function modifyInbound(imageHW, recXYHW, type) {
  // this function is used to check certain rectangle is inside
  // the image. If rec is in bound, return rec, otherwise modify
  // it to fit in bound.
  // check crop figures inside the image
  if (!(recXYHW.x < imageHW.width && recXYHW.y < imageHW.height && recXYHW.x + recXYHW.width < imageHW.width && recXYHW.y + recXYHW.height < imageHW.height && recXYHW.x > 0 && recXYHW.y > 0)) {
    // the crop figure exceed the original image boundary
    if (recXYHW.x < imageHW.width && recXYHW.y < imageHW.height && recXYHW.x > 0 && recXYHW.y > 0) {
      // the begin point is valid => work on width and height to fit
      if (recXYHW.x + recXYHW.width > imageHW.width) {
        recXYHW.width = imageHW.width - recXYHW.x;
      }
      if (recXYHW.y + recXYHW.height > imageHW.height) {
        recXYHW.height = imageHW.height - recXYHW.y;
      }
    } else {
      if (recXYHW.x > imageHW.width) {
        console.log(`!! ${type} config error !! Beginning x exceed boundary !!`);
      }
      if (recXYHW.y > imageHW.height) {
        console.log(`!! ${type} config error !! Beginning y exceed boundary !!`);
      }
    }
  }
  return recXYHW;
}

async function getimagFunc(args, preArgs) {
  // args :
  // link <--refmaxwidth[co-responding ratio]> <--crop[x]x[y]-[width]x[height]> <--watermkwidth[co-responding ratio]> <--mo[x]x[y]-[width]x[height]> [ratio] [ratio width height] [width height]
  var webpSettings = {};

  const originPic = args[0];
  const dimensions = await sharp("./source" + originPic).metadata();

  webpSettings.width = dimensions.orientation == 1 ? dimensions.width : dimensions.height;
  webpSettings.height = dimensions.orientation == 1 ? dimensions.height : dimensions.width;

  const inputImageAspectRatio = webpSettings.width / webpSettings.height;

  if (args[1] === "original") {
    // original case
    return {};
  }

  var imagFunc = {
    composite: !preArgs.nwatermk,
    compress: !preArgs.ncompress,
    refmaxwidth: defaultOptions.defaultrefmaxwidth,
    watermkwidth: defaultOptions.defaultwatermkwidth
  };

  for (var i = 0; i < args.length; i++) {
    if (/^--crop/i.test(args[i])) {
      // override ratio option
      args[i] = args[i].replace(/^--crop/i, "").split(/[x-]/i);
      imagFunc.crop = {
        x: parseInt(args[i][0]),
        y: parseInt(args[i][1]),
        width: parseInt(args[i][2]),
        height: parseInt(args[i][3])
      };
      const recXYHW = modifyInbound({ width: webpSettings.width, height: webpSettings.height }, { x: imagFunc.crop.x, y: imagFunc.crop.y, width: imagFunc.crop.width, height: imagFunc.crop.height }, "crop");
      [imagFunc.crop.x, imagFunc.crop.y, imagFunc.crop.width, imagFunc.crop.height] = [recXYHW.x, recXYHW.y, recXYHW.width, recXYHW.height];
    } else if (/^--refmaxwidth/i.test(args[i])) {
      imagFunc.refmaxwidth = parseInt(args[i].replace(/^--refmaxwidth/i, ""));
    } else if (/^--watermkwidth/i.test(args[i])) {
      imagFunc.watermkwidth = parseInt(args[i].replace(/^--watermkwidth/i, ""));
    } else if (/^--mo/i.test(args[i])) {
      args[i] = args[i].replace(/^--mo/i, "").split(/[x-]/i);
      imagFunc.mosaics = {
        x: parseInt(args[i][0]),
        y: parseInt(args[i][1]),
        width: parseInt(args[i][2]),
        height: parseInt(args[i][3])
      };
      const recXYHW = modifyInbound({ width: webpSettings.width, height: webpSettings.height }, { x: imagFunc.mosaics.x, y: imagFunc.mosaics.y, width: imagFunc.mosaics.width, height: imagFunc.mosaics.height }, "mosaics");
      [imagFunc.mosaics.x, imagFunc.mosaics.y, imagFunc.mosaics.width, imagFunc.mosaics.height] = [recXYHW.x, recXYHW.y, recXYHW.width, recXYHW.height];
    } else if (/^--ratio/i.test(args[i])) {
      args[i] = args[i].replace(/^--ratio/i, "").split(/[:]/i);
      if (!("crop" in imagFunc)) {
        var picRatio = [parseInt(args[i][0]), parseInt(args[i][1])];
        picRatio = picRatio[0] / picRatio[1];
        let ratioW = webpSettings.width;
        let ratioH = webpSettings.height;
        if (inputImageAspectRatio > picRatio) {
          ratioW = webpSettings.height * picRatio;
        } else if (inputImageAspectRatio < picRatio) {
          ratioH = webpSettings.width / picRatio;
        }
        const shiftArr = [(webpSettings.width - ratioW) * 0.5, (webpSettings.height - ratioH) * 0.5];
        imagFunc.crop = {
          x: parseInt(shiftArr[0]),
          y: parseInt(shiftArr[1]),
          width: parseInt(ratioW),
          height: parseInt(ratioH)
        };
      }
    } else if (/^--resize/i.test(args[i])) {
      args[i] = args[i].replace(/^--resize/i, "").split(/[x]/i);
      imagFunc.resize = {
        width: parseInt(args[i][0]),
        height: parseInt(args[i][1])
      };
    }
  }
  return imagFunc;
}

/*
process the image with assigned image functions
*/

function picProcess(args) {
  // args :
  // [original] [fancybox] [nwatermk] [ncompress] link <--refmaxwidth[co-responding ratio]> <--watermkwidth[co-responding ratio]> <--crop[x]x[y]-[width]x[height]> <--mo[x]x[y]-[width]x[height]> [ratio] [width height]
  let caption;
  [caption, args] = findCaption(args);

  let preArgs = { fancybox: false, nwatermk: false, original: false, ncompress: false };
  let argsPar;

  for (var i = 0; i < args.length; i++) {
    if (/\bfancybox\b/i.test(args[i])) {
      preArgs.fancybox = true;
      args[i] = "";
    } else if (/\bnwatermk\b/i.test(args[i])) {
      preArgs.nwatermk = true;
      args[i] = "";
    } else if (/\boriginal\b/i.test(args[i])) {
      preArgs.original = true;
      args[i] = "";
    } else if (/\bncompress\b/i.test(args[i])) {
      preArgs.ncompress = true;
      args[i] = "";
    }
  }
  // reorder options
  let optionArgs = new Array(6);
  if (!preArgs.original) {
    // image has to be process as normal
    for (var i = 0; i < args.length; i++) {
      // ensure refmaxwidth in 1st place
      if (/^--refmaxwidth/i.test(args[i])) {
        optionArgs[0] = args[i];
        args[i] = "";
      }
      // ensure watermkwidth in 2nd place
      else if (/^--watermkwidth/i.test(args[i])) {
        optionArgs[1] = args[i];
        args[i] = "";
      }
      // ensure crop in 3rd place
      else if (/^--crop/i.test(args[i])) {
        optionArgs[2] = args[i];
        args[i] = "";
      }
      // ensure mosaics in 4th place
      else if (/^--mo/i.test(args[i])) {
        optionArgs[3] = args[i];
        args[i] = "";
      }
      // ensure ratio in 5th place
      else if (/^--ratio/i.test(args[i])) {
        optionArgs[4] = args[i];
        args[i] = "";
      }
      // ensure resize in 6th place
      else if (/^--resize/i.test(args[i])) {
        optionArgs[5] = args[i];
        args[i] = "";
      }
    }

    args = args.filter((a) => a);
    optionArgs = optionArgs.filter((a) => a);
    args.splice(1, 0, ...optionArgs);
    argsPar = [...args];
    if (preArgs.ncompress) {
      argsPar.splice(1, 0, "ncompress");
    }
    if (preArgs.nwatermk) {
      argsPar.splice(1, 0, "nwatermk");
    }
    argsPar.shift();
    argsPar = argsPar.join(" ");
  } else {
    args = args.filter((a) => a);
    args = [args[0], "original"];
    argsPar = "original";
  }

  const parMD5 = md5.hex(argsPar).slice(0, 9);

  const originPic = path.parse(args[0]);
  var moveToP = originPic.dir + "/";
  moveToP = moveToP.replace("/post_image", "");
  const finalP = moveToP + originPic.name + "_" + parMD5 + ".webp";
  const finalPjpg = moveToP + originPic.name + "_" + parMD5 + ".jpg";

  let html;
  if (!preArgs.fancybox) {
    html = `<picture><source type="image/webp" srcset=${finalP.replace("./source", "")}>
     <img src=${finalPjpg.replace("./source", "")} class="nofancybox"> </picture>`;
  } else {
    html = `<img src=${finalPjpg.replace("./source", "")} class="fancybox"`;
    if (caption) {
      html += ` data-caption="${caption}"`;
    }
    html += `>`;
  }
  const picConfig = [args, finalP, finalPjpg, preArgs];

  return [html, picConfig];
}

function findCaption(args) {
  let argsStr = args.join(" ");
  let caption = "";
  let nargs = [...args];
  if (/--desc\|(.*)\|/i.test(argsStr)) {
    // there has a description attribute
    caption = argsStr.match(/--desc\|(.*)\|/i)[1];
    argsStr = argsStr.replace(/ --desc\|(.*)\|/i, "");
    nargs = argsStr.split(" ");
  }
  return [caption, nargs];
}

function filterDuplicateLists(picList) {
  var map = {};
  for (var i = 0; i < picList.length; i++) {
    var element = picList[i][1]; // arr[i] is the element in the array at position i
    (map[element] || (map[element] = [])).push(i);
  }
  for (var element in map) {
    if (map[element].length > 1) {
      for (var i = map[element].length - 1; i > 0; i--) {
        picList[map[element][i]] = [];
      }
    }
  }
  var picList = picList.filter(function (item) {
    return item.length !== 0;
  });

  return picList;
}

async function ImageWatermark(picConfigP = []) {
  try {
    const options = defaultOptions;
    var picList = filterDuplicateLists(hexo.locals.get("picList"));
    var plist = hexo.locals.get("enhancePicList");

    let watermarkBuffer = await utils.GetWatermarkImageBuffer(hexo.route.list(), options.watermarkImage, hexo.route);

    const localPicPro = async (picConfig) => {
      const filePath = picConfig[0][0];
      const picWebp = picConfig[1];
      const picJpg = picConfig[2];
      const preArgs = picConfig[3];
      const imagFunc = await getimagFunc(picConfig[0], preArgs);

      // webp
      if (!IsEqual(picWebp)) {
        const stream = hexo.route.get(filePath);
        const arr = [];
        stream.on("data", (chunk) => arr.push(chunk));
        console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;94mGenerated Image Process: \x1b[0m\x1b[40;95m${picWebp}\x1b[0m`);
        const sourceBuffer = await new Promise(function (resolve) {
          stream.on("end", () => resolve(Buffer.concat(arr)));
        });
        const compositeInfo = await StaticImageRender(sourceBuffer, watermarkBuffer, options, imagFunc, "webp");
        if (compositeInfo.isError) {
          console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;93mGenerated Image Waring: \x1b[0m\x1b[40;95m${picWebp}\x1b[0m \x1b[40;93mThe width and height of the watermark image are larger than the original image, and cannot be rendered. The original image has been returned.\x1b[0m`);
        } else {
          console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;92mGenerated Image Success: \x1b[0m\x1b[40;95m${picWebp}\x1b[0m`);
          setImageCache(picWebp, compositeInfo.compositeBuffer);
        }
      }

      // JPG
      if (!IsEqual(picJpg)) {
        // read to original file to the buffer
        const stream = hexo.route.get(filePath);
        const arr = [];
        stream.on("data", (chunk) => arr.push(chunk));
        console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;94mGenerated Image Process: \x1b[0m\x1b[40;95m${picJpg}\x1b[0m`);
        const sourceBuffer = await new Promise(function (resolve) {
          stream.on("end", () => resolve(Buffer.concat(arr)));
        });
        const compositeInfo = await StaticImageRender(sourceBuffer, watermarkBuffer, options, imagFunc, "jpg");
        if (compositeInfo.isError) {
          console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;93mGenerated Image Waring: \x1b[0m\x1b[40;95m${picJpg}\x1b[0m \x1b[40;93mThe width and height of the watermark image are larger than the original image, and cannot be rendered. The original image has been returned.\x1b[0m`);
        } else {
          console.log(`\x1b[40;94mINFO\x1b[0m  \x1b[40;92mGenerated Image Success: \x1b[0m\x1b[40;95m${picJpg}\x1b[0m`);
          setImageCache(picJpg, compositeInfo.compositeBuffer);
        }
      }

      if (/^(g)/.test(hexo.env.cmd)) {
        // only copy files when the image
        if (!fs.pathExistsSync("public" + picJpg)) {
          fs.copySync("image" + picJpg, "public" + picJpg);
        }
        if (!fs.pathExistsSync("public" + picWebp)) {
          fs.copySync("image" + picWebp, "public" + picWebp);
        }
      } else {
        if (!hexo.route.list().includes(picWebp.replace("/", ""))) {
          hexo.route.set(picWebp.replace("/", ""), () => fs.createReadStream("./image" + picWebp));
        }
        if (!hexo.route.list().includes(picJpg.replace("/", ""))) {
          hexo.route.set(picJpg.replace("/", ""), () => fs.createReadStream("./image" + picJpg));
        }
      }
    };

    if (picConfigP) {
      localPicPro(picConfigP);
      if (IsEqual(picConfigP[1])&&!plist.includes(picConfigP[1])) { plist.push(picConfigP[1]); }
      if (IsEqual(picConfigP[2])&&!plist.includes(picConfigP[2])) { plist.push(picConfigP[2]); }
    } else if (picList.length) {
      picList.forEach((picConfig) => {
        localPicPro(picConfig);
        if (IsEqual(picConfig[1])&&!plist.includes(picConfig[1])) { plist.push(picConfig[1]); }
        if (IsEqual(picConfig[2])&&!plist.includes(picConfig[2])) { plist.push(picConfig[2]); }
      });
    }

    hexo.locals.set("picList", []);
  } catch (err) {
    console.log(`\x1b[40;91m${err}\x1b[0m`);
    console.log(err);
  }
}

hexo.locals.set("enhancePicList", []);
hexo.locals.set("picList", []);

hexo.extend.tag.register("webp", function (args) {
  const [html, picConfig] = picProcess(args);
  var plist = hexo.locals.get("picList");
  plist.push(picConfig);
  hexo.locals.set("picList", plist);
  return html;
});

hexo.extend.helper.register("webp_helper", function (args, capt) {
  args = args.split(" ");
  if (capt) {
    args.push("--desc|" + capt + "|");
  }
  const [html, picConfig] = picProcess(args);
  ImageWatermark(picConfig);
  return html;
});

hexo.extend.filter.register("after_generate", ImageWatermark);

hexo.extend.generator.register("file_to_route", () => {
  // set the enhanced image to route
  var picList = hexo.locals.get("enhancePicList");
  return picList.map((el) => {
    return {
      path: el.replace("/", ""),
      data: () => {
        return fs.createReadStream("./image" + el);
      }
    };
  });
});
