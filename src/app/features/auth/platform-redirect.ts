import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
@Component({selector:'app-platform-redirect',template:'<p>Opening TecSA Platform…</p>'})
export class PlatformRedirect {
 constructor(){const page=inject(ActivatedRoute).snapshot.data['registration']?'erp/register':'erp';window.location.assign(environment.platformWebsiteUrl.replace(/\/$/,'')+'/'+page);}
}
