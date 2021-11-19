public with sharing class FlexContact {
    @AuraEnabled(cacheable=true)
    public static Contact getContactDetails(String discordId) {
        return [
            SELECT Id, Name, Phone, influence__c, sentiment__c, discordID__c, Email, pic__c
            FROM Contact
            WHERE discordId__c = :discordId
        ];
    }
}