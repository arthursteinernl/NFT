
function enable() {
  return detectEthereumProvider().then(provider => {
    if (!provider) {
      document.querySelector('#metamask-required').style.display = 'block';
      return Promise.reject();
    }
    return provider.enable().then(() => {
      window.ethProvider = new ethers.providers.Web3Provider(provider);
      window.ethProvider.on("chainChanged", (chainId) => { window.location.reload() });
      window.ethProvider.on("accountsChanged", () => { window.location.reload() });
      window.ethSigner = window.ethProvider.getSigner();
      initContract();
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

function checkCode() {
  var code = document.getElementById('code').value;
  if (code === '') {
    alert('Invalid code');
    return;
  }
  window.TokenContract.checkCode(code).then(valid => {
    if (valid) {
      document.getElementById('code').classList.add('valid');
    } else {
      document.getElementById('code').classList.add('invalid');
    }
  })
}
async function claim() {
  var code = document.getElementById('code').value;
  const valid = await window.TokenContract.checkCode(code);
  if(!valid) {
    document.getElementById('code').classList.add('invalid');
    alert('Invalid Password');
    return;
  }
  window.TokenContract.claim(code).then(tx => {
    document.querySelector('#password-form').style.display = 'none';
    document.querySelector('#success').style.display = 'block';
    tx.wait(2).then(() => {
      document.querySelector('#mined').style.display = 'block';
      loadOwnership();
    });
  }).catch(err => {
    let message = err.message;
    if (err.data && err.data.message) {
      message = err.data.message;
    }
    if (message.match(/Invalid Code/i)) {
      alert('Invalid code');
    } else if (message.match(/Already Claimed/i)) {
      alert('Already claimed');
    } else {
      alert("Failed to claim: " + message);
    }
  });
}

function addToMetaMask() {
  if (!window.ethereum) {
    return;
  }
  ethereum.request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address: CONTRACT_ADDRESS,
        symbol: TOKEN_SYMBOL,
        decimals: TOKEN_DECIMALS,
      }
    }
  });
}

async function loadOwnership() {
  window.ethSigner.getAddress().then(address => {
    // check the user's balance
    window.TokenContract.balanceOf(address).then(count => {
      // if it's zero do nothing
      if (count.isZero()) {
        return;
      }
      // just load the first token and display the details
      window.TokenContract.tokenOfOwnerByIndex(address,0).then(tokenId => {
        document.querySelectorAll('#success .token-id').forEach((el) => {
          el.innerHTML = tokenId.toString();
        });
        document.querySelector('#success .token-id').innerHTML = tokenId.toString();
        document.querySelector('#success').style.display = 'block';
        document.querySelector('#password-form').style.display = 'none';
        document.querySelector('#start').style.display = 'none';
        const link = "https://opensea.io/assets/" + window.TokenContract.address + "/" + tokenId.toString();
        document.querySelectorAll('.opensea-link').forEach((el) => {
          el.href = link;
        });
        document.querySelector('#mined').style.display = 'block';
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById('code').addEventListener('keyup', function(e) {
    if (!window.TokenContract) {
      return;
    }
    var code = e.target.value;
    window.TokenContract.checkCode(code).then(valid => {
      if (valid) {
        e.target.classList.add('valid');
      } else {
        e.target.classList.remove('valid');
      }
    })

  });
  document.querySelector('#start button').addEventListener('click', function(event) {
    event.preventDefault();
    enable().then(() => {
      document.querySelector('#password-form').style.display = 'block';
      document.querySelector('#start').style.display = 'none';
      loadOwnership();
    });
  });
  document.querySelector('#password-form button').addEventListener('click', function(event) {
    event.preventDefault();
    claim();
  });
  // if the user has an account connected load the token
  detectEthereumProvider().then(provider => {
    if (provider) {
      provider.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
          enable().then(() => {
            document.querySelector('#password-form').style.display = 'block';
            document.querySelector('#start').style.display = 'none';
            loadOwnership();
          })
        }
      });
    } else {
      document.querySelector('#metamask-required').style.display = 'block';
    }
  });
});
