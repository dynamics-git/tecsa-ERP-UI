import type { ListFactBoxConfig } from '../../../platform/public-api';
export const usersFactBoxConfig: ListFactBoxConfig = {
  enabled: true,
  overview: true,
  sections: [{id:'details', title:'Details', fields:[
    {id:'created',field:'systemCreatedAt',label:'Created at',type:'datetime'},
    {id:'modified',field:'systemModifiedAt',label:'Modified at',type:'datetime'},
  ]}],
};
