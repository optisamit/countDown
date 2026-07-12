var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, customElement, property } from '../lib/lit-element.js';
import './cd-timer.js';
import "./cd-header.js";
import { Theme } from '../theme.js';
class CountDownProxy {
    constructor(onUpdate) {
        this.Timers = [];
        this.sounds = ["media/alert.mp3", "media/open-ended.ogg", "media/open-your-eyes-and-see.ogg", "media/oringz-w437.ogg", "media/slow-spring-board.ogg", "media/to-the-point.ogg", "media/youve-been-informed.ogg"];
        chrome.runtime.connect({ name: 'keepAlive' });
        chrome.storage.sync.get(['timersData', 'badgeTimer'], (data) => {
            this.Timers = data.timersData || [];
            const badgeId = data.badgeTimer;
            this.badgeTimer = this.Timers.find(t => t.id === badgeId);
            onUpdate();
        });
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync') {
                if (changes.timersData) {
                    this.Timers = changes.timersData.newValue || [];
                }
                if (changes.badgeTimer || changes.timersData) {
                    const badgeId = changes.badgeTimer ? changes.badgeTimer.newValue : (this.badgeTimer ? this.badgeTimer.id : undefined);
                    this.badgeTimer = this.Timers.find(t => t.id === badgeId);
                }
                onUpdate();
            }
        });
    }
    startTimer(timer) {
        chrome.runtime.sendMessage({ action: 'startTimer', timer });
    }
    stopTimer(timer) {
        chrome.runtime.sendMessage({ action: 'stopTimer', timer });
    }
    createTimer() {
        chrome.runtime.sendMessage({ action: 'createTimer' });
    }
    removeTimer(timer) {
        chrome.runtime.sendMessage({ action: 'removeTimer', timer });
    }
    updateTimer(timer) {
        chrome.runtime.sendMessage({ action: 'updateTimer', timer });
    }
    setBadgeTimer(timer) {
        chrome.runtime.sendMessage({ action: 'setBadgeTimer', timer });
    }
}
let CountDownView = class CountDownView extends LitElement {
    constructor() {
        super();
        this.selected = 0;
        let element = this;
        element.timers = [];
        element.countDown = new CountDownProxy(() => {
            element.timers = element.countDown.Timers;
            element.requestUpdate();
        });
        chrome.storage.sync.get(function (Data) {
            if (Data.themeIndex !== undefined) {
                Theme.Set(Data.themeIndex);
            }
        });
    }
    updated() {
        this.selected = ((this.selected % this.timers.length) + this.timers.length) % this.timers.length;
        let timer = this.timers[this.selected];
        const timerElement = this.shadowRoot.querySelector('#t' + timer.id);
        timerElement.focus();
    }
    _onStart(e) {
        this.countDown.startTimer(e.detail);
    }
    _onStop(e) {
        this.countDown.stopTimer(e.detail);
    }
    _onDelete(e) {
        this._removeTimer(e.detail);
    }
    _onUpdate(e) {
        this.countDown.updateTimer(e.detail);
    }
    _onAdd(e) {
        this.countDown.createTimer();
        this.selected = this.timers.length - 1;
    }
    _onOptions(e) {
        Theme.Change();
    }
    _onBadge(e) {
        this.countDown.setBadgeTimer(e.detail);
        this.requestUpdate();
    }
    _onSound(e) {
        e.detail.sound += 1;
        if (e.detail.sound > this.countDown.sounds.length) {
            e.detail.sound = 1;
        }
        this.countDown.updateTimer(e.detail);
    }
    _onVolume(e) {
        e.detail.volume -= 0.2;
        if (e.detail.volume < 0) {
            e.detail.volume = 1;
        }
        this.countDown.updateTimer(e.detail);
    }
    _onInput(e) {
        if (e.path[0].localName == "input") {
            console.trace(e);
            if (e.keyCode == 13) {
                if (this.selected != this.preselected) {
                    this.selected = this.preselected;
                }
                else {
                    this.requestUpdate();
                }
            }
            return;
        }
        if (e.keyCode == 38) {
            this.selected--;
        }
        if (e.keyCode == 40) {
            this.selected++;
        }
        if (e.keyCode == 45) {
            this.countDown.createTimer();
            this.selected = this.timers.length - 1;
        }
        if (e.keyCode == 46) {
            this._removeTimer(this.timers[this.selected]);
        }
    }
    _onSelect(e, index) {
        if (e.path[0].localName == "input") {
            this.preselected = index;
            return;
        }
        this.selected = index;
    }
    _removeTimer(timer) {
        this.countDown.removeTimer(timer);
        if (this.selected == this.timers.length) {
            this.selected--;
        }
        else {
            this.requestUpdate();
        }
    }
    render() {
        if (!this.countDown) {
            return html `Something is not right :/`;
        }
        return html `
    <div tabindex="-1" @keydown=${this._onInput}>
      <cd-header @add=${this._onAdd} @options=${this._onOptions}></cd-header>
      ${this.timers.map((timer, index) => html `
      <cd-timer ?selected=${this.selected == index} ?badge=${this.countDown.badgeTimer == timer} tabindex="-1" id="t${timer.id}"
        .timer=${timer} @click=${function (e) { this._onSelect(e, index); }} @start=${this._onStart} @stop=${this._onStop}
        @delete=${this._onDelete} @update=${this._onUpdate} @badge=${this._onBadge} @options.sound=${this._onSound}
        @options.volume=${this._onVolume}></cd-timer>`)}
    </div>
    `;
    }
};
__decorate([
    property()
], CountDownView.prototype, "selected", void 0);
__decorate([
    property()
], CountDownView.prototype, "timers", void 0);
CountDownView = __decorate([
    customElement('count-down')
], CountDownView);
export { CountDownView };
