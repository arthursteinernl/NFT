
function enable() {
  return detectEthereumProvider().then(provider => {
    return provider.enable().then(() => {
      window.ethProvider = new ethers.providers.Web3Provider(provider);
      window.ethProvider.on("chainChanged", (chainId) => { window.location.reload() });
      window.ethProvider.on("accountsChanged", () => { window.location.reload() });
      window.ethSigner = window.ethProvider.getSigner();
    }).catch(err => {
      console.log(err);
      alert('Cound not connect to your wallet: ' + err.message);
    });
  }).catch(err => {
    console.log(err);
    alert('Could not connect to your wallet: ' + err.message);
  })
}

function initContract() {
  window.TokenContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    window.TokenMetadata.abi,
    window.ethSigner || window.ethProvider
  );
}

function startClaim() {
  var code = document.getElementById('code').value;
  if (code === '') {
    alert('Invalid code');
    return;
  }
  enable().then(() => {
    initContract();
    window.TokenContract.claim(code).then(tx => {
      alert('Transaction sent');
      tx.wait().then(() => {
        alert('Transaction mined. You are now the owner.');
      });
    }).catch(err => {
      console.log(err);
      if (err.data && err.data.message) {
        if (err.data.message.match(/Invalid Code/i)) {
          alert('Invalid code');
        } else if (err.data.message.match(/Already Claimed/i)) {
          alert('Already claimed');
        }
      } else {
        alert("Failed to claim: " + err.message);
      }
    })
  });
}

document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.start-claim').forEach(function(e) {
    e.addEventListener('click', function(event) {
      event.preventDefault();
      startClaim();
    });
  });
});
