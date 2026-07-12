class CountDown {

    public Timers: Array<TimerModel>;
    public badgeHandler: number;
    public badgeTimer: TimerModel;

    readonly sounds: Readonly<string[]> = ["media/alert.mp3","media/open-ended.ogg","media/open-your-eyes-and-see.ogg","media/oringz-w437.ogg","media/slow-spring-board.ogg","media/to-the-point.ogg","media/youve-been-informed.ogg"]

    constructor() {
        this._load();
    }

    public startTimer(timer: TimerModel) {
        if (timer.end === undefined) {
            let timeout = 0;
            if (timer.pause === undefined) {
                timeout = timer.time;
            } else {
                timeout = timer.pause;
            }

            if (timeout < 0) {
                timer.start = new Date().getTime() + timeout;
            }
            else {
                timer.start = new Date().getTime();
            }

            timer.end = new Date().getTime() + timeout;
            timer.pause = undefined;

            if (timeout > 0) {
                chrome.alarms.create(timer.id, { when: timer.end });
                chrome.notifications.clear(timer.id);   
            }

            if(this.badgeTimer == timer){
                this._startBadge();
            }

        } else {
            timer.pause = timer.end - new Date().getTime();
            timer.end = undefined;
            chrome.alarms.clear(timer.id);
        }

        countDown._save();
    }

    public stopTimer(timer: TimerModel) {
        timer.end = undefined;
        timer.start = undefined;
        timer.pause = undefined;

        chrome.alarms.clear(timer.id);

        countDown._updateBadge();
        countDown._save();
    }

    public createTimer(time: number = 0) {
        let timer = { id: CountDown._uuidv4(), time: time, note: "", notification: true, sound: 1, volume: 1 } as TimerModel;
        this.addTimer(timer);
    }

    public addTimer(timer: TimerModel) {
        this.Timers.push(timer);
        countDown._save();
    }

    public removeTimer(timer: TimerModel) {
        if (this.Timers.length == 1)
            return;

        let index = this.Timers.indexOf(timer);
        if (index != -1) {
            this.stopTimer(this.Timers[index]);
            this.Timers.splice(index, 1);
        }

        if(timer == this.badgeTimer){
            this.badgeTimer = undefined;
            countDown._updateBadge();
        }

        countDown._save();
    }

    public updateTimer(timer: TimerModel) {
        countDown._save();
    }

    public setBadgeTimer(timer: TimerModel) {
        let index = this.Timers.indexOf(timer);
        if (index != -1) {
            if (this.Timers[index] == countDown.badgeTimer) {
                countDown.badgeTimer = undefined;
                chrome.storage.sync.remove('badgeTimer');
                this._updateBadge();
            }
            else {
                countDown.badgeTimer = this.Timers[index];
                this._startBadge();
                chrome.storage.sync.set({ 'badgeTimer': this.badgeTimer.id });
            }
        }
    }

    private _startBadge() {
            (chrome as any).action.setBadgeBackgroundColor({ color: "#388E3C"});
            if (this.badgeHandler === undefined) {
                this.badgeHandler = setInterval(this._updateBadge, 100) as any;
            }
    }

    private _updateBadge() {
        if(countDown.badgeTimer !== undefined){
            if(countDown.badgeTimer.end !== undefined){
                let time = (countDown.badgeTimer.start == countDown.badgeTimer.end) ? new Date().getTime() - countDown.badgeTimer.start : countDown.badgeTimer.end - new Date().getTime();
                (chrome as any).action.setBadgeText({ text: CountDown._convertTime(time, true)});
            }
            else{
                if(countDown.badgeHandler !== undefined){
                    clearInterval(countDown.badgeHandler);
                    countDown.badgeHandler = undefined;
                }

                if(countDown.badgeTimer.pause !== undefined){
                    (chrome as any).action.setBadgeBackgroundColor({ color: "#FF5722"});
                    (chrome as any).action.setBadgeText({ text: CountDown._convertTime(Math.abs(countDown.badgeTimer.pause), true)});
                }
                else{
                    (chrome as any).action.setBadgeBackgroundColor({ color: "#1976D2"});
                    (chrome as any).action.setBadgeText({ text: CountDown._convertTime(countDown.badgeTimer.time, true)});
                }
            }
        }
        else{
            if(countDown.badgeHandler !== undefined){
                clearInterval(countDown.badgeHandler);
                countDown.badgeHandler = undefined;
            }

            (chrome as any).action.setBadgeText({ text: "" });
        }
    }

    private _save() {
        chrome.storage.sync.set({ 'timersData': this.Timers });
    }

    private _load() {
        this.Timers = new Array<TimerModel>();
        let controller = this;

        chrome.storage.sync.get(function (Data) {
            if (Data.timersData !== undefined) {
                controller.Timers = Data.timersData;
                controller._startTimers();
            }
            else {
                if(Data.timers !== undefined) {
                    let badgeID = Data.settings !== undefined ? Data.settings.bID : -1;
                    for(var id in Data.timers) {
                        let t = Data.timers[id];
                        let timer = {
                            id: CountDown._uuidv4(),
                            time: t.time,
                            pause: t.pause == 0? undefined : t.pause, 
                            start:  t.start == 0? undefined : t.start, 
                            end:  t.end == 0 ? undefined : t.end,
                            note: t.set,
                            notification: true,
                            sound: 1,
                            volume: 1 
                        } as TimerModel;

                        controller.addTimer(timer);

                        if(badgeID == t.id){
                            countDown.setBadgeTimer(timer);
                        }
                     }

                     chrome.storage.sync.remove("timers");
                     chrome.storage.sync.remove("settings");
                }
                else {
                    controller.createTimer(60000);
                    controller.createTimer();
                }
            }

            if (Data.badgeTimer !== undefined) {
                for (let index = 0; index < controller.Timers.length; index++) {
                    const timer = controller.Timers[index];
                    if(timer.id == Data.badgeTimer){
                        countDown.badgeTimer = timer;
                        controller._startBadge();
                        break;
                    }
                }
            }
        });
    }

    private _startTimers() {
        this.Timers.forEach(timer => {
            if (timer.end !== undefined && timer.pause === undefined && timer.start !== timer.end) {
                let timeout = timer.end - new Date().getTime();
                if (timeout > 0) {
                    chrome.alarms.create(timer.id, { when: timer.end });
                } else {
                    this._onAlarm(timer);
                }
            }
        });
    }

    private _onAlarm(timer: TimerModel) {
        if(timer.notification == true) {
            countDown._createNotification(timer);
        }
        if(timer.volume > 0.01) {
            countDown._playSound(timer);
        }

        countDown.stopTimer(timer);
    }

    private _createNotification(timer: TimerModel) {
        let options: chrome.notifications.NotificationOptions = {
            type: "basic",
            iconUrl: "img/icon-128.png",
            title: CountDown._convertTime(timer.time),
            message: (timer.note !== undefined) ? timer.note : "",
            contextMessage: "countDown",
            priority: 2,
            eventTime: Date.now(),
            buttons: [{ title: "Restart" }],
            requireInteraction: true,
            silent: true
        };

        chrome.notifications.create(timer.id, options);
    }

    private _playSound(timer: TimerModel) {
        const soundPath = this.sounds[timer.sound - 1];
        const volume = timer.volume;
        (chrome as any).offscreen.createDocument({
            url: 'views/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play alarm sound'
        }).then(() => {
            chrome.runtime.sendMessage({ action: 'play', sound: soundPath, volume });
        }).catch(() => {
            chrome.runtime.sendMessage({ action: 'play', sound: soundPath, volume });
        });
    }

    private static _convertTime(ms: number, short: boolean = false): string {
        return new Date(ms).toJSON().replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z/, function (match, p1, p2, p3, p4, p5, p6, p7) {
            let days = Math.floor(ms / (3600 * 24 * 1000));
            let daystring = (days == 0) ? " " : days;

            if(short){
                if(days > 0){
                    return daystring + "d";
                }
                if(p4 > 0){
                    return p4 + ":" + p5;
                }
                return p5 + ":" + p6;
            }

            return daystring + " " + p4 + ":" + p5 + ":" + p6;
        });
    }

    private static _uuidv4(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

var countDown = new CountDown();

// Active ports to track if popup is open
let activePorts = new Set<any>();

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keepAlive') {
        activePorts.add(port);
        if (countDown.badgeTimer && !countDown.badgeHandler) {
            countDown['_startBadge']();
        }
        port.onDisconnect.addListener(() => {
            activePorts.delete(port);
            if (activePorts.size === 0) {
                if (countDown.badgeHandler) {
                    clearInterval(countDown.badgeHandler);
                    countDown.badgeHandler = undefined;
                }
            }
        });
    }
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let timer = message.timer;
    if (timer && timer.id) {
        const found = countDown.Timers.find(t => t.id === timer.id);
        if (found) {
            Object.assign(found, timer);
            timer = found;
        }
    }

    switch (message.action) {
        case 'startTimer':
            countDown.startTimer(timer);
            break;
        case 'stopTimer':
            countDown.stopTimer(timer);
            break;
        case 'createTimer':
            countDown.createTimer();
            break;
        case 'removeTimer':
            countDown.removeTimer(timer);
            break;
        case 'updateTimer':
            countDown.updateTimer(timer);
            break;
        case 'setBadgeTimer':
            countDown.setBadgeTimer(timer);
            break;
    }
});

// Listener for Chrome Alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    const timer = countDown.Timers.find(t => t.id === alarm.name);
    if (timer) {
        countDown['_onAlarm'](timer);
    }
});

// Listener for Notification Button Clicks
chrome.notifications.onButtonClicked.addListener((id, index) => {
    if (index !== 0) {
        return;
    }

    countDown.Timers.some(timer => {
        if (timer.id === id) {
            if (timer.end === undefined) {
                countDown.startTimer(timer);
            }
            return true;
        }
    });
});

