
function getConnectionSpeed() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    // downlinkMax provides the estimated maximum downlink speed in Mbps
    // bandwidth is a deprecated property that might be available in older browsers
    const speedMbps = connection.downlinkMax || connection.bandwidth;

    if (speedMbps !== undefined) {
      console.log(`Estimated connection speed: ${speedMbps} Mbps`);
      // You can then send this information to your popup or content script
      // using chrome.runtime.sendMessage or long-lived ports.
    } else {
      console.log("Connection speed information not available.");
    }
  } else {
    console.log("Network Information API not supported in this browser.");
  }
}
