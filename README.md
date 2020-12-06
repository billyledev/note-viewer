# Note Viewer

A simple webapp to load your Onyx Boox Note backups. All the code is running on the client side.  

You can find an online demo running [here](https://artania06.github.io/note-viewer/index.html).

It is based on Vue.js framework and uses OnsenUI components.  
Additionally, this project uses [SQL.js](https://github.com/sql-js/sql.js) and [JSZip](https://github.com/Stuk/jszip) libs.  
Linting is done with ESLint using the AirBnB style.

<br/>
<br/>

## News

Added support for circles, rectangles, triangles, lines, colors and thicknesses!  

![Shape update image](https://artania06.github.io/note-viewer/shapeUpdate.jpg)

<br/>
<br/>

## How to use

First, click on the file icon to open the backup selection window. You can then select your notes backup (*.zip format).  

![Open backup image](https://artania06.github.io/note-viewer/selectBackup.jpg)

<br/>

Once the backup is loaded, you can open the menu by clicking on the top left icon.  
You can then select the note you want to load.  

![Open menu image](https://artania06.github.io/note-viewer/openMenu.jpg)

<br/>

After selecting the note, you can navigate between the pages by using the arrows.  
You will also find the current page and the number of pages at the bottom of the window.  

![Note pages navigation](https://artania06.github.io/note-viewer/pagesUI.jpg)

<br/>
<br/>

## Limitations

The project is still in development and it can't display properly shapes, colors and stroke size.

<br/>
<br/>

## Project setup
```
npm install
```

Remember to set CI_PROJECT_NAME environment variable for production build.

<br/>

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```
