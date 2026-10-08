/**
 * EOD Gmail forwarding automation.
 * Install as a time-driven trigger (every 15 minutes) in script.google.com.
 * Script Properties:
 *   EOD_REPORT_ENDPOINT = https://tjhsrydhkigvhlllnstm.supabase.co/functions/v1/eod-mail-reports
 *   EOD_REPORT_SYNC_TOKEN = same private token configured in Supabase Edge Function secrets
 * Runs under the Gmail account owner. Never publish this script as a web app.
 */
function syncEodGmailReports() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('EOD_REPORT_ENDPOINT');
  const token = props.getProperty('EOD_REPORT_SYNC_TOKEN');
  if (!endpoint || !token) throw Error('Set endpoint and sync token in Script Properties');
  const reports = [
    {kind:'upcoming',query:'subject:"FHWA Inventory Due" has:attachment filename:xlsx'},
    {kind:'bad',query:'subject:"Chassis Bad Order" has:attachment filename:xlsx'}
  ];
  for (const report of reports) {
    const threads = GmailApp.search(report.query,0,10);
    const messages = threads.flatMap(thread=>thread.getMessages()).sort((a,b)=>b.getDate()-a.getDate());
    const latest = messages.find(m=>m.getAttachments().some(a=>/\.xlsx?$/i.test(a.getName())));
    if (!latest) continue;
    const attachment = latest.getAttachments().find(a=>/\.xlsx?$/i.test(a.getName()));
    const digestKey = 'last_'+report.kind;
    const messageId = latest.getId();
    if (props.getProperty(digestKey)===messageId) continue;
    const response=UrlFetchApp.fetch(endpoint,{
      method:'post',contentType:'application/json',
      headers:{'x-eod-token':token},
      payload:JSON.stringify({
        kind:report.kind,messageId,
        base64:Utilities.base64Encode(attachment.getBytes())
      }),
      muteHttpExceptions:true
    });
    if(response.getResponseCode()!==200)throw Error(report.kind+' upload failed: '+response.getResponseCode()+' '+response.getContentText());
    props.setProperty(digestKey,messageId);
  }
}
