import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/users',keyField:'systemId',navigation:{parentEndpoint:'/users',parentIdFields:['systemId'],childCollection:'sessions'},supportsCreate:false,supportsDelete:false,supportsUpdate:false,pageSize:100};
export const userSessionsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'user-sessions',pageType:'worksheet',title:'Sessions',module:'Administration',autoSave:true,
  permissionPageId:'users',
  dataSource:source,identity:{primaryField:'userName'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const userSessionsHeaderConfig: HeaderConfig = {
  dialogTitle:'Sessions',toolbarButtons:[],sections:[],
};
export const userSessionsLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'userAgent',label:'Device / Browser',valueType:'text',},
    {id:'ipAddress',label:'IP Address',valueType:'text',},
    {id:'startedAt',label:'Signed In',valueType:'datetime',readonly:true,},
    {id:'lastSeenAt',label:'Last Seen',valueType:'datetime',readonly:true,},
    {id:'expiresAt',label:'Expires',valueType:'datetime',readonly:true,},
    {id:'signedIn',label:'Signed In',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'recentlyActive',label:'Recently Active',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
