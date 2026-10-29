import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/permissionSets',keyField:'systemId',navigation:{parentEndpoint:'/permissionSets',parentIdFields:['systemId'],childCollection:'targetRights'},supportsCreate:false,supportsDelete:false,supportsUpdate:false,pageSize:100};
export const permissionTargetRightsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'permission-target-rights',pageType:'worksheet',title:'Field and Action Permissions',module:'Administration',autoSave:true,
  permissionPageId:'permission-sets',
  dataSource:source,identity:{primaryField:'code'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const permissionTargetRightsHeaderConfig: HeaderConfig = {
  dialogTitle:'Field and Action Permissions',toolbarButtons:[],sections:[],
};
export const permissionTargetRightsLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'targetId',label:'Target ID',valueType:'guid',},
    {id:'canView',label:'Visible',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canEdit',label:'Editable',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canExecute',label:'Execute',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
