"use strict";

const sharp = require("sharp");

async function StaticImageRender(sourceBuffer, watermarkBuffer, options, imagFunc, type) {
  const watermark = sharp(watermarkBuffer);
  const composite = sharp(sourceBuffer);
  let compositeBuffer =  await composite.rotate().toBuffer();
  const compositeMetdata = await composite.metadata();

  if (Object.entries(imagFunc).length === 0) {
    return {
      isError: false,
      compositeBuffer
    };
  }

  if (imagFunc.mosaics) {
    // make a copy of before process image buffer
    const moCompositeBuffer = await sharp(compositeBuffer)
      .extract({ left: imagFunc.mosaics.x, top: imagFunc.mosaics.y, width: imagFunc.mosaics.width, height: imagFunc.mosaics.height })
      .blur(options.blurSigma)
      .toBuffer();
    compositeBuffer = await sharp(compositeBuffer)
      .composite([
        {
          input: moCompositeBuffer,
          top: imagFunc.mosaics.x,
          left: imagFunc.mosaics.y
        }
      ])
      .toBuffer();
  }

  if (imagFunc.crop) {
    compositeMetdata.height = imagFunc.crop.height;
    compositeMetdata.width = imagFunc.crop.width;
    compositeBuffer = await sharp(compositeBuffer).extract({ left: imagFunc.crop.x, top: imagFunc.crop.y, width: imagFunc.crop.width, height: imagFunc.crop.height }).toBuffer();
  }

  if (imagFunc.resize) {
    compositeMetdata.height = imagFunc.resize.height;
    compositeMetdata.width = imagFunc.resize.width;
    compositeBuffer = await sharp(compositeBuffer)
      .resize({
        width: imagFunc.resize.width,
        height: imagFunc.resize.height,
        fit: "fill"
      })
      .toBuffer();
  }

  if (imagFunc.composite) {
    const watermkFactor = compositeMetdata.width > imagFunc.refmaxwidth ? (imagFunc.watermkwidth / imagFunc.refmaxwidth) * compositeMetdata.width : imagFunc.watermkwidth;
    const { data, info } = await watermark
      .rotate(options.rotate, {
        background: options.background
      })
      .resize({ width: parseInt(watermkFactor * 0.3) })
      .toBuffer({ resolveWithObject: true });
    const watermarkNewBuffer = data;
    const watermarkMetdata = info;

    if (
      parseInt(compositeMetdata.height - watermarkMetdata.height - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15)) > 0 &&
      parseInt(compositeMetdata.width - watermarkMetdata.width - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15)) > 0
    ) {
      compositeBuffer = await sharp(compositeBuffer)
        .composite([
          {
            input: watermarkNewBuffer,
            top: parseInt(compositeMetdata.height - watermarkMetdata.height - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15)),
            left: parseInt(compositeMetdata.width - watermarkMetdata.width - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15))
          }
        ])
        .toBuffer();
    } else {
      console.log("!! image size smaller than watermark !! Skip add watermark.");
      console.log("shift top: ", parseInt(compositeMetdata.height - watermarkMetdata.height - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15)));
      console.log("shift left: ", parseInt(compositeMetdata.width - watermarkMetdata.width - (compositeMetdata.width > imagFunc.refmaxwidth ? (compositeMetdata.width * 15) / imagFunc.refmaxwidth : 15)));
      console.log("watermark metadata: ", watermarkMetdata);
      console.log("image metadata: ", compositeMetdata);
    }
  }

  // if the resolution of original pic / processed pic so low
  // then increase the quality for clearness
  if (imagFunc.compress) {
    compositeBuffer = await sharp(compositeBuffer)
      .jpeg({ quality: options.jpgQuality + (compositeMetdata.width < options.qualityWidthTheshold ? 30 : 0), mozjpeg: true, force: type.toUpperCase() === "JPG" })
      .webp({ quality: options.webpQuality + (compositeMetdata.width < options.qualityWidthTheshold ? 30 : 0), force: type.toUpperCase() === "WEBP" })
      .toBuffer();
  }

  return {
    isError: false,
    compositeBuffer
  };
}

module.exports = StaticImageRender;
