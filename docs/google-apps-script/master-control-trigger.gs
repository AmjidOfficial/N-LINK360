function installNLinkMasterSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncMasterDataToNLink') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncMasterDataToNLink').timeBased().everyHours(1).create();
}
