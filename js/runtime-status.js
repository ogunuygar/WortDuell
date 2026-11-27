// A missing or outdated runtime must not look like a sync in progress.
setTimeout(function(){
  var status=document.getElementById('cloudStatus');
  if(status && status.textContent.trim()==='Preparing sync…'){
    var msg='Sync module did not initialize. Check the published release (WD-SYNC-7). Local progress is unchanged.';
    status.textContent=msg;
    var mobile=document.getElementById('wdMobileCloudStatus');if(mobile)mobile.textContent=msg;
    var connect=document.getElementById('cloudConnect');if(connect)connect.disabled=true;
  }
},15000);
