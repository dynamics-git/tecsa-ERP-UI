import { DataSourceConfig, HeaderConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const pageConfigurationHeaderConfig: HeaderConfig = {
  dialogTitle:'Page Configuration',
  toolbarButtons:[],
  sections:[{id:'general',title:'General',fields:[
    {key:'pageId',label:'Page ID',readonly:true},
    {key:'title',label:'Title',readonly:true},
    {key:'pageType',label:'Page Type',readonly:true},
    {key:'module',label:'Module',readonly:true},
    {key:'route',label:'URL',readonly:true},
    {key:'resource',label:'Resource',readonly:true},
    {key:'isActive',label:'Active',type:'boolean',readonly:true},
  ]}],
};
export const pageConfigurationListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'page-configuration',pageType:'card',title:'Page Configuration',module:'Administration',
  menu:{module:'Administration',group:'Security',icon:'ts-icon ts-icon-settings',moduleIcon:'ts-icon ts-icon-administration-module',route:'/page-configuration'},
  identity:{primaryField:'pageId',secondaryField:'title'},
  dataSource:{endpoint:'/permissionPages',keyField:'systemId',defaultSort:'pageId asc',supportsCreate:false,supportsUpdate:false,supportsDelete:false,pageSize:25},
  standardActions:{new:false,delete:false},
  dataSurface:{idField:'systemId',columns:listColumns(pageConfigurationHeaderConfig,['pageId','title','pageType','module','route','resource','isActive'])},
  factBox:{enabled:true},
};
