import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';

declare var gapi: any;
declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {


  @ViewChild("signin_button") signInButton!:HTMLElement
  @ViewChild("signout_button") signOutButton!:HTMLElement

  tokenClient: any;
  accessToken: any;
  gapiInited = false;
  gisInited = false;
  signInButtonVisible = false;
  signOutButtonVisible = false;

  CLIENT_ID =
    "Your-Client-ID";
  API_KEY = 'Your-API-Key';

  // Array of API discovery doc URLs for APIs used by the quickstart
  DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  ];

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  SCOPES = 'https://www.googleapis.com/auth/calendar';


  calenderItems: any[] = [];
  lastDays: any[] = [];
  firstDay:any;
  lastDay:any;
  currentMoney:any;
  weeks:any;
  showAll = false;

  constructor(private changeDetection: ChangeDetectorRef) {
    this.intializeGapiClient= this.intializeGapiClient.bind(this)
  }



  content:any

  ngOnInit(): void {
    // @ts-ignore
    window.onGoogleLibraryLoad = () => {
      gapi.load('client', this.intializeGapiClient);
      // @ts-ignore
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id:this.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (response: any) => {
          this.accessToken = response.access_token;
        }, // defined later
      });

      this.gisInited = true;
      this.maybeEnableButtons();
    };
  }

  async intializeGapiClient() {
    await gapi.client.init({
      apiKey: this.API_KEY,
      discoveryDocs: this.DISCOVERY_DOCS,
    });
    this.gapiInited = true;
    this.maybeEnableButtons();
  }

  grantAccess() {
    this.tokenClient.requestAccessToken();
  }

  maybeEnableButtons() {
    if (this.gapiInited && this.gisInited) {
      this.signInButtonVisible = true;
      this.changeDetection.detectChanges()
    }
  }

  /**
   *  Sign in the user upon button click.
   */
  handleAuthClick() {
    this.tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        throw resp;
      }
      this.signInButtonVisible = false
      this.signOutButtonVisible=true

      await this.listUpcomingEvents();
      this.changeDetection.detectChanges()
    };

    if (gapi.client.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      this.tokenClient.requestAccessToken({ prompt: '' });
    }
  }


  async listUpcomingEvents() {
    let response;
    try {
      const request = {
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime',
      };
      response = await gapi.client.calendar.events.list(request);
    } catch (err:any) {
      this.content = err.message;
      this.changeDetection.detectChanges()

      return;
    }

    const events = response.result.items;
    if (!events || events.length == 0) {
      this.content = 'No events found.'
      this.changeDetection.detectChanges()

      return;
    }
    // Flatten to string to display
    const output = events.reduce(
        (str:any, event:any) => `${str}${event.summary} (${event.start.dateTime || event.start.date})\n`,
        'Events:\n');
    this.content = output
    this.changeDetection.detectChanges()

  }

  async getCalender() {
    this.calenderItems = [];
    this.lastDays = [];
    var date = new Date();
    this.firstDay = new Date();
    this.lastDay = this.getNextDayOfWeek(this.firstDay, 6); //get next saturday
    this.lastDay.setHours(23, 59, 59, 999);
    this.lastDays.push(new Date(this.lastDay));

    const events = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: this.firstDay.toISOString(),
      timeMax: this.lastDay.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // console.log(events);
    this.calenderItems.push(events.result.items);

    this.firstDay = new Date(this.lastDay);
    this.firstDay.setDate(this.firstDay.getDate() + 1);
    this.firstDay.setHours(0, 0, 0, 0);
    this.lastDay.setDate(this.lastDay.getDate() + 1 * 7);
    this.lastDays.push(new Date(this.lastDay));
    for (let index = 0; index < this.weeks - 1; index++) {
      const events = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: this.firstDay.toISOString(),
        timeMax: this.lastDay.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
      });

      // console.log(events);
      this.calenderItems.push(events.result.items);

      this.firstDay = new Date(this.lastDay);
      this.firstDay.setDate(this.firstDay.getDate() + 1);
      this.firstDay.setHours(0, 0, 0, 0);
      this.lastDay.setDate(this.lastDay.getDate() + 1 * 7);
      this.lastDays.push(new Date(this.lastDay));
    }

    this.firstDay = new Date();
    this.lastDay = this.getNextDayOfWeek(this.firstDay, 6); //get next saturday
    this.lastDay.setHours(23, 59, 59, 999);
    this.changeDetection.detectChanges()
  }

  async insertEvent() {
    for (let index = 0; index < this.calenderItems.length; index++) {
      const group = this.calenderItems[index];
      let existing = group.filter((x:any)=>{return x.colorId == "6"})
      var finalmoney = this.calculateMoney(group);
      if (existing.length>0){
        const events = await gapi.client.calendar.events.update({
          calendarId: 'primary',
          eventId:existing[0].id,
          colorId: '6',
          start: {
            dateTime: existing[0].start.dateTime,
            timeZone: existing[0].start.timeZone,
          },
          end: {
            dateTime: existing[0].end.dateTime,
            timeZone: existing[0].end.timeZone,
          },
          summary: '$' + finalmoney,
        });
      }
      else{
        var date = new Date(this.lastDays[index]);
        date.setHours(0, 0, 0, 0);
        const events = await gapi.client.calendar.events.insert({
          calendarId: 'primary',
          colorId: '6',
          start: {
            dateTime: date.toISOString(),
            timeZone: 'America/Chicago',
          },
          end: {
            dateTime: date.toISOString(),
            timeZone: 'America/Chicago',
          },
          summary: '$' + finalmoney,
        });
      }
    }

    await this.getCalender();
    this.changeDetection.detectChanges()

  }

  async deleteAllorangeEvents() {
    await this.getCalender();
    var batch = gapi.client.newBatch();
    this.calenderItems.forEach((group) => {
      group.forEach(async (event:any) => {
        if (event.colorId == '6' || event.colorId == 6) {
          var requuest = this.searchRequest(event.id);
          batch.add(requuest);
          // const events = await gapi.client.calendar.events.delete({
          //   calendarId: 'primary',
          //   eventId:event.id,
          //   sendupdate: 'all'
          // });
        }
      });
    });
    batch.then(async (response:any) => {
      console.log('delete reponse', response);
      await this.getCalender();
    });
    this.changeDetection.detectChanges()

  }

  searchRequest(id:any) {
    var d = gapi.client.request({
      path: 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}',
      params: { calendarId: 'primary', eventId: id },
      method: 'delete',
    });
    this.changeDetection.detectChanges()
    return d;
  }

  getNextDayOfWeek(date:any, dayOfWeek:any) {
    // dayOfWeek
    // 0-Sunday
    // 1-monday
    // 2-tuesday
    // etc...

    var resultDate = new Date(date.getTime());

    resultDate.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7));

    this.changeDetection.detectChanges()
    return resultDate;
  }

  calculateMoney(group:any) {
    var re = /\$([\d]+)/;
    var finalMoney = 0 + parseInt(this.currentMoney);

    group.forEach((item:any) => {
      var text: string = item.summary;
      var array = re.exec(text);
      var money;
      if (array != null) {
        if (array[1] == null) money = 0;
        else {
          money = parseInt(array[1]);
        }
      } else {
        money = 0;
      }

      if (item.colorId == 11) {
        finalMoney -= money;
      }
      if (item.colorId == 2) {
        finalMoney += money;
      }
    });
    this.currentMoney = parseInt(JSON.parse(JSON.stringify(finalMoney)));
    this.changeDetection.detectChanges()
    return finalMoney;
  }

}
