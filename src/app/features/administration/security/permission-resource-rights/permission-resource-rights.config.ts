import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/permissionSets',keyField:'systemId',navigation:{parentEndpoint:'/permissionSets',parentIdFields:['systemId'],childCollection:'permissions'},supportsCreate:false,supportsDelete:false,supportsUpdate:false,pageSize:100};
export const permissionResourceRightsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'permission-resource-rights',pageType:'worksheet',title:'Resource Permissions',module:'Administration',autoSave:true,
  permissionPageId:'permission-sets',
  dataSource:source,identity:{primaryField:'code'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const permissionResourceRightsHeaderConfig: HeaderConfig = {
  dialogTitle:'Resource Permissions',toolbarButtons:[],sections:[],
};
export const permissionResourceRightsLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'resource',label:'Resource',valueType:'text',},
    {id:'canRead',label:'Read',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canCreate',label:'Insert',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canModify',label:'Modify',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canDelete',label:'Delete',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canExecute',label:'Execute',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
