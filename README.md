# HEXO-SHARP-SCRIPT

This project is a copy and modification based on [a related image process lib](https://github.com/SpiritLingPub/hexo-images-watermark). [Jykell picture tag](https://github.com/rbuchberger/jekyll_picture_tag) is used as reference.\
This is a use case script and not a node module. I decide to not publish to node module is because a image nodule can be a black-hole and various case by case. I hope people who can use this repository ad a template to start modify for their own purpose.\
This script is using [Sharp](https://github.com/lovell/sharp) for image processing.\
Originally, the watermark library support gif. But I am not using gif currently and thus not implemented. (Original files are kept for reference)

You, as a blog beginner. You probably just need a simple HEXO tag or sort of easy way to insert images.
When you try out official methods, you are not satisfied by that since it is using original image that you linking to and it can cause significantly large project size.
This repository provides some options for compressing, watermarking, resizing and cropping.
This script will normally produce two images in format of WEBP and JPG. The quality of the compression can be defined.

## Before use:
1. use node js install modules:
```shell
$ npm install fs-extra gifwrap jimp js-md5 sharp svg2png ext-to-svg
```
2. copy all files to `/scripts` folder
```
.
├── ...
├── scripts
│   ├── img_lib
│   │   ├── constants
│   │   │   └── cachePath.js
│   │   ├── render
│   │   │   ├── dynamic.js
│   │   │   └── static.js
│   │   ├── utils
│   │   │   ├── cache.js
│   │   │   ├── dynGetWatermarkImageBufferamic.js
│   │   │   ├── index.js
│   │   │   ├── isEqual.js
│   │   │   ├── text2svg.js
│   │   │   └── trueTo256.js
│   │   ├── config.js
│   │   └── index.js
└── ...
```

3. Place your watermark `Watermark.svg` file to either `source/images` or `themes/YOUR_THEME/source/images` folder. This is a file must exists in order to run this script. This image file can be replaced by other images and define the path in the `config.js` file.

## Use in markdown

Usage template:\
`[original] [fancybox] [nwatermk] [ncompress] link <--refmaxwidth[co-responding ratio]> <--watermkwidth[co-responding ratio]> <--crop[x]x[y]-[width]x[height]> <--mo[x]x[y]-[width]x[height]> <--ratio[width]:[height]> <--resize[width]x[height]>`

- pre-options (optional)
    - original\
        This option will overwrite ALL other options
        ```md
        {% webp original /post_image/abc.JPG %}
        ```
    - fancybox\
        In some themes, fancybox is used. This script normally return html code with image tag with class of `nofancybox`. This option allows to escape from the assumption.
        ```md
        {% webp fancybox /post_image/abc.JPG %}
        ```
    - nwatermk\
        If you don't want to add watermark to the image, add this option to the tag.
        ```md
        {% webp nwatermk /post_image/abc.JPG %}
        ```
    - ncompress\
        Sometimes, the result image being pixelate when resizing the image. The final image maybe so blurry and invisible. This option allows to skip the compression close the end of the process.
        ```md
        {% webp ncompress /post_image/abc.JPG %}
        ```
- link (compulsory)\
    The link is the main separation between optional options and image operators.
    Since images maybe used in multiple posts, single image will be used as source. If all options are the same, then the image will be generated once only.
    Image source folder hs to be located under the source folder.\
    The link for image `def.JPG` is `/post_image/abc/def.JPG`.

```
.
├── ...
├── source
│   ├── post_image
│   │   ├── abc
│   │   │   └── def.JPG
│   │   └── ghi.PNG
└── ...
```


- post-options (optional)
    - --refmaxwidth[co-responding ratio]\
        This is parameter for adding watermark to the image.
        I define the maximum display width in my site is 1000px. Therefore, the watermark can be resized for different pixel density for every after processing images in order to showing same watermark size visually. 
        ```md
        {% webp /post_image/abc.JPG --refmaxwidth1000 %}
        ```

    - --watermkwidth[co-responding ratio]\
        This is parameter for adding watermark to the image.
        In personal use case, the water mark image width is 200px.
        This parameter will work with the previous one in combination for adjusting the distance between the right bottom conner and the water mark.
        ```md
        {% webp /post_image/abc.JPG --watermkwidth200 %}
        ```

    - --crop[x]x[y]-[width]x[height]\
        Imagine, you want a section of image from original image. 
        ```md
        {% webp /post_image/abc.JPG --crop200x200-50x50 %}
        ```
        The resultant will crop the image from (200,200) with width 50px and height 50px.

    - --mo[x]x[y]-[width]x[height]\
        This option allows to blur out a section in the image.
        ```md
        {% webp /post_image/abc.JPG --mo200x200-50x50 %}
        ```

    - --ratio[width]:[height]\
        The most quick and dirty image cropping function to crop to certain ratio.
        ```md
        {% webp /post_image/abc.JPG --ratio1:1 %}
        ```
        Consider the image having various aspect ratio, the resultant image will be cropped follows the given ratio in the middle section.

    - --resize[width]x[height]\
        This function is used for resizing the process image by certain width and height.
        ```md
        {% webp /post_image/abc.JPG --resize300:200 %}
        ```

## Priority of the options
Notice that there may have billions of combination of options. There are fundamental priority design.

- `original` have highest priority that direct return unprocessed and uncompressed image but change the image format to WEBP and JPG with MD5 name.
- `crop` will override the `ratio` option

## Notes
- Images will only be process if and only if `webp` tag is used in .md file or `webp_helper` tag used in .ejs file which is different from most of other hexo image plugins.
- The processed images will be stored in `image` folder under the root directory of the project.

## Use in ejs template
It is the same usage as the use in markdown. But the tag curly bracket to square bracket.

In markdown:
```md
{% webp /post_image/abc.JPG --resize300:200 %}
```
In ejs template:
```md
<%- webp_helper /post_image/abc.JPG --resize300:200 %>
```

## Right of usage
The watermark library does not mentions any licence allocated to their project.
MIT license is applied for this repository.