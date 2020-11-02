const { app, BrowserWindow, Menu, Tray, nativeImage, shell, Notification, ipcMain, dialog, nativeTheme} = require('electron')
const PdApi = require('./src/pd_api')
const Store = require('electron-store');
const dayjs = require('dayjs')
const store = new Store();
const interval = 2

function createSettingWindow(config) {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: true,
    resizable: true,
    backgroundColor: '#454545',
    show: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      preload: __dirname + '/src/browser/preload.js' 
    }
  });
  mainWindow.loadFile(__dirname + '/src/browser/index.html')

  mainWindow.webContents.on('did-finish-load', ()=>{
    mainWindow.webContents.send('load_config', config);
  });

  mainWindow.on('close', (event) => {
    app.dock.hide();
  });
}

function createWindow () {
  const apiKey = store.get('apiKey', '');
  const userId = store.get('userId', '');

  if (apiKey === '' || userId === '') {
    createSettingWindow({apiKey, userId});
    return;
  }

  app.dock.hide()
  const tray = new Tray(__dirname + '/assets/images/icon.png')
  // 通知済みインシデント
  const notified_incident_ids = [];
  // 設定メニュー
  const configMenu= {
    label: 'Setting',
    click: () => {
      createSettingWindow({apiKey, userId});
      app.dock.show();
    }
  }

  const contextMenu = Menu.buildFromTemplate([{ label: 'Loading...', type: 'normal' }, configMenu]);
  tray.setContextMenu(contextMenu)

  const pdApi = new PdApi(apiKey);
  // ３秒おきに処理
  setInterval(() => {
    pdApi.fetchTriggeredIncidents(userId, dayjs().subtract(600, 'minute').toISOString())
      .then((incidents) => {
        console.log(incidents);
        if (incidents.find(incident => incident['status'] === 'triggered')) {
          tray.setImage(generateNativeImageIcon('red'));
        } else if (incidents.length > 0) {
          tray.setImage(generateNativeImageIcon());
        } else {
          tray.setImage(generateNativeImageIcon(nativeTheme.shouldUseDarkColors ? 'white' : 'gray'));
        }

        const contextMenuTemplate = [];

        // インシデントを1個ずつ処理する
        incidents.forEach(incident => {
          // メニューに追加
          contextMenuTemplate.push({
            label: `[${incident['service']['summary']}]${incident['title']}`,
            icon: incident['status'] === 'triggered' ? generateNativeImageIcon('red') : generateNativeImageIcon('yellow'),
            click: () => {
              shell.openExternal(incident['html_url']);
            }
          })
          // 通知済み、もしくはAck済みはスキップ
          if (notified_incident_ids.includes(incident['incident_number']) || incident['status'] === 'acknowledged' ) {
            return
          }

          // 通知
          const notification = new Notification({title: incident['title'], body: incident['service']['summary']});
          notification.show();
          notification.on('click', (event, arg)=>{
            shell.openExternal(incident['html_url']);
          });
          notified_incident_ids.push(incident['incident_number'])
        });

        // メニューを更新
        contextMenuTemplate.push(configMenu);
        tray.setContextMenu(Menu.buildFromTemplate(contextMenuTemplate))        
      }).catch(() => {})
  }, interval * 1000)
}

// コンフィグを保存
ipcMain.on("save_config", (event, {apiKey, userId}) => {
  store.set('apiKey', apiKey);
  store.set('userId', userId);

  dialog.showMessageBox({
    type: 'info',
    title: 'Success',
    message: 'Config Saved',
    detail: 'Please relaunch application.'
  });

  process.exit(0);
});

function generateNativeImageIcon(color = null) {
  let nativeImageFile = nativeImage.createFromPath(__dirname + '/assets/images/icon.png');
  if (color === 'gray') {
    nativeImageFile = nativeImage.createFromPath(__dirname + '/assets/images/icon_gray.png');
  } else if (color === 'white') {
    nativeImageFile = nativeImage.createFromPath(__dirname + '/assets/images/icon_white.png');
  } else if (color === 'yellow') {
    nativeImageFile = nativeImage.createFromPath(__dirname + '/assets/images/icon_yellow.png');
  } else if (color === 'red') {
    nativeImageFile = nativeImage.createFromPath(__dirname + '/assets/images/icon_red.png');
  }
  return nativeImageFile
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})