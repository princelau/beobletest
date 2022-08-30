import React, { useState, useRef } from "react";
import { ethers } from "ethers";
import "./index.scss";

const ethereumChainIds = [1, 3, 4, 5, 42];

const InfoCard = () => {
  const [ensName, setEnsName] = useState(null);
  const [ensAvatar, setEnsAvatar] = useState(null);
  const [networkInfo, setNetworkInfo] = useState({});
  const [signature, setSignature] = useState("");
  const [verifiedSignature, setVerifiedSignature] = useState("");
  const [defaultAccount, setDefaultAccount] = useState("");

  const [userBalance, setUserBalance] = useState("-");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // refs for text inputs
  const signMessageRef = useRef(null);
  const verifySignatureRef = useRef(null);
  const verifyMessageRef = useRef(null);

  const connectWalletHandler = async () => {
    // check if metamask is installed
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      if (provider) {
        let defaultAccountAddress;
        let ensName;
        let networkInfoResponse;

        // get accounts
        await provider
          .listAccounts()
          .then((result) => {
            defaultAccountAddress = result[0];
            setDefaultAccount(defaultAccountAddress);
          })
          .catch((error) => {
            alert(error.message);
          });

        // get balance
        await provider
          .getBalance(defaultAccountAddress)
          .then((result) => {
            setUserBalance(ethers.utils.formatEther(result));
          })
          .catch((error) => {
            alert(error.message);
          });

        // get network info
        await provider
          .getNetwork()
          .then((response) => {
            networkInfoResponse = {
              chainId: response.chainId,
              ensAddress: response.ensAddress,
              name: response.name,
            };

            setNetworkInfo(networkInfoResponse);
          })
          .catch((error) => {
            alert(error.message);
          });

        // ensure that chain is ethereum
        if (ethereumChainIds.includes(networkInfoResponse?.chainId)) {
          // look up ens name
          await provider
            .lookupAddress(defaultAccountAddress)
            .then((response) => {
              if (response !== null) {
                ensName = response;
                setEnsName(ensName);
              }
            })
            .catch((error) => {
              console.log(error);
              alert(error.message);
            });

          // look up ens avatar if ens name exists
          if (ensName) {
            await provider
              .getAvatar(ensName)
              .then((response) => {
                if (response !== null) {
                  setEnsAvatar(response);
                }
              })
              .catch((error) => {
                alert(error.message);
              });
          }
        }

        // set provider for state use
        setProvider(provider);
        // set signer
        setSigner(provider.getSigner());
      } else {
        alert("Error connecting to Web 3 Provider");
      }
    } else {
      alert("Please Install MetaMask");
    }
  };

  const disconnectWalletHandler = () => {
    provider.off("accountsChanged", accountChangedHandler);
    provider.off("chainChanged", chainChangedHandler);
    setEnsName(null);
    setEnsAvatar(null);
    setNetworkInfo({});
    setSignature("");
    setVerifiedSignature("");
    setDefaultAccount("");
    setUserBalance("-");
    setProvider(null);
    setSigner(null);
  };

  // function to handle account change
  const accountChangedHandler = (newAccountAddress) => {
    setDefaultAccount(newAccountAddress);
    getUserBalance(newAccountAddress.toString());
  };

  // function to handle chain change
  const chainChangedHandler = () => {
    window.location.reload();
  };

  const signMessage = async () => {
    if (signer !== null) {
      await signer
        .signMessage(signMessageRef.current.value)
        .then((response) => {
          if (response !== null) {
            setSignature(response);
          }
        })
        .catch((error) => {
          alert(error.message);
        });
    } else {
      alert("Please connect wallet");
    }
  };

  const verifySignature = () => {
    let verifiedSignature;

    if (!verifyMessageRef.current.value) {
      alert("Please input message to verify");
      return;
    }
    if (!verifySignatureRef.current.value) {
      alert("Please input signature to verify");
      return;
    }

    try {
      verifiedSignature = ethers.utils.verifyMessage(
        verifyMessageRef.current.value,
        verifySignatureRef.current.value
      );
    } catch (error) {
      alert(error.message);
    }
    setVerifiedSignature(verifiedSignature);
  };

  const getUserBalance = (accountAddress) => {
    provider.getBalance(accountAddress).then((balance) => {
      setUserBalance(ethers.utils.formatEther(balance));
    });
  };

  const truncateSignature = (signature) => {
    if (signature.length === 0) {
      return "-";
    }
    const signatureLength = signature.length;
    return (
      signature.substring(0, 10) +
      "..." +
      signature.substring(signatureLength - 10)
    );
  };

  // execute on account change
  window.ethereum.on("accountsChanged", accountChangedHandler);

  // execute on chain change
  window.ethereum.on("chainChanged", chainChangedHandler);

  return (
    <div className="info-container">
      {provider == null ? (
        <div className="wallet-connect-container">
          <button
            className="wallet-connect-button"
            onClick={connectWalletHandler}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="profile-container">
            <div className="profile-content">
              <img
                className="profile-avatar"
                src={
                  ensAvatar !== null
                    ? ensAvatar
                    : require("../../assets/images/avatar.png").default
                }
              />
              <div className="profile-info">
                <div className="profile-name">{`Welcome${
                  ensName !== null ? `, ${ensName}` : ""
                }`}</div>
                <div className="profile-address">{defaultAccount}</div>
              </div>
            </div>
            <div className="profile-details-container">
              <div className="profile-chain-id">
                Chain ID: {networkInfo.chainId}
              </div>
              <div className="profile-wallet-balance">
                Wallet Balance: {userBalance} ETH
              </div>
            </div>
          </div>
          <div className="signing-container">
            <div className="signature-container">
              <div className="signature">
                Computed Signature: {truncateSignature(signature)}
              </div>
              <button
                className="signature-copy"
                onClick={() => {
                  navigator.clipboard.writeText(signature);
                  alert(`Signature copied to clipboard!`);
                }}
              >
                Copy
              </button>
            </div>
            <label>Message To Sign:</label>
            <input
              className="signing-message"
              type="text"
              ref={signMessageRef}
            />
            <div className="signing-message-button" onClick={signMessage}>
              Sign Message
            </div>
          </div>

          <div className="verifying-container">
            <div className="verifying">
              Verified Signature: {verifiedSignature ? verifiedSignature : "-"}
            </div>
            <div className="verify-inputs">
              <label>Message To Verify:</label>
              <input
                className="verifying-message"
                type="text"
                ref={verifyMessageRef}
              />
              <label>Signature To Verify:</label>
              <input
                className="verifying-message"
                type="text"
                ref={verifySignatureRef}
              />
            </div>
            <div className="verifying-message-button" onClick={verifySignature}>
              Verify Signature
            </div>
          </div>
          <button
            className="wallet-disconnect-button"
            onClick={disconnectWalletHandler}
          >
            Disconnect Wallet
          </button>
        </>
      )}
    </div>
  );
};

export default InfoCard;
