import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/users',keyField:'systemId',navigation:{parentEndpoint:'/users',parentIdFields:['systemId'],childCollection:'permissionSets'},supportsCreate:true,supportsDelete:true,supportsUpdate:true,pageSize:100};
export const userPermissionSetsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'user-permission-sets',pageType:'worksheet',title:'User Permission Sets',module:'Administration',autoSave:true,
  permissionPageId:'users',
  dataSource:source,identity:{primaryField:'userName'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const userPermissionSetsHeaderConfig: HeaderConfig = {
  dialogTitle:'User Permission Sets',toolbarButtons:[],sections:[],
};
export const userPermissionSetsLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'permissionSetId',label:'Permission Set',valueType:'guid',lookup:{endpoint:'/permissionSets',valueField:'systemId',displayField:'code',searchFields:['code']},cellType:'dropdown',},
    {id:'companyId',label:'Company (optional)',valueType:'guid',lookup:{endpoint:'/companies',valueField:'systemId',displayField:'code',searchFields:['code']},cellType:'dropdown',},
    {id:'isActive',label:'Active',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
