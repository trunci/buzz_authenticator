import * as fcl from "@onflow/fcl";
import { useState, useEffect } from "react";
import "regenerator-runtime/runtime";

export default class BuzzLib {
  static transactionStatusPointer = null;
  static user = null;

  static logIn() {
    fcl.logIn();
  }

  static logOut() {
    fcl.unauthenticate();
  }

  static styles = {
    widget: {
      width: 400,
      height: 150,
      backgroundColor: "#fff",
      margin: 10,
      boxShadow: "1px 1px 4px 0.5px #000",
      borderRadius: 10,
    },
  };

  static initialize(setTransactionStatus = null, user = null, setUser = null) {
    fcl.config({
      "accessNode.api": "https://testnet.onflow.org", // Mainnet: "https://mainnet.onflow.org"
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Mainnet: "https://fcl-discovery.onflow.org/authn"
    });
    if (setTransactionStatus) {
      // Save transaction status pointer to change
      this.transactionStatusPointer = setTransactionStatus;
    } else {
      const [_, a] = useState(null);
      this.transactionStatusPointer = a;
    }

    if (fcl.currentUser.loggedIn !== null && this.user == null) {
      console.log(user);
    }

    if (setUser) {
      useEffect(() => fcl.currentUser.subscribe(setUser), []);
    }

    if (user) {
      this.user = user;
    }

    console.log("Buzz authenticated. Ready to continue.");
    console.log("User address: " + this.user?.addr);
  }

  static notify(transactionId) {
    fcl
      .tx(transactionId)
      .subscribe((res) => this.transactionStatusPointer(res.status));
  }

  ////////////////////////
  // Transactions
  ////////////////////////

  // Creates the original account and capabilities
  static async setUp() {
    console.log("Buzz started set up sequence.");
    const transactionId = await fcl.mutate({
      cadence: `
            import NonFungibleToken from 0x631e88ae7f1d7c20
            import Buzz4 from 0x5d572e6f1bd2f5da

            transaction {

                prepare(acct: AuthAccount) {
        
                    // 1. Create a Chip Collection if the user doesn't have one
                    if acct.borrow<&Buzz4.Collection>(from: /storage/BuzzCollection) == nil {
                        // Create a new empty collection
                        let collection <- Buzz4.createEmptyCollection()
        
                        // save it to the account
                        acct.save(<-collection, to: /storage/BuzzCollection)
        
                        // create a public capability for the collection
                        acct.link<&{Buzz4.BuzzCollectionPublic}>(
                            /public/BuzzCollectionPublic,
                            target: /storage/BuzzCollection
                        )
                        log("Created account")
                    }   
                    log("No need to create account")
                }
            }
            `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
    });
    // this.notify(transactionId);
    console.log("Buzz concluded set up sequence.");
  }

  // Creates the original account and capabilities
  static async forceSetUp() {
    console.log("Buzz started force set up sequence.");
    const transactionId = await fcl.mutate({
      cadence: `
      import NonFungibleToken from 0x631e88ae7f1d7c20
      import Buzz4 from 0x5d572e6f1bd2f5da

      transaction {

          prepare(acct: AuthAccount) {
  
            var a <- acct.load<@Buzz4.Collection>(from: /storage/BuzzCollection)
            destroy a
                
          }
      }
            `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
    });
    this.notify(transactionId);
    console.log("Buzz concluded force set up sequence.");
  }

  // Creates a new chip
  static async create_chip(name, companyId, password) {
    console.log("Buzz started chip creation sequence.");
    const transactionId = await fcl.mutate({
      cadence: `

            import NonFungibleToken from 0x631e88ae7f1d7c20
            import Buzz4 from 0x5d572e6f1bd2f5da
            
            transaction(name: String, companyId: UInt64, password: String) {
            
                let collection: &Buzz4.Collection
            
                prepare(acct: AuthAccount) {
            
                    log("Starting")
                    self.collection = acct.borrow<&Buzz4.Collection>(from: /storage/BuzzCollection) ?? panic("Error")
                }
            
                execute{
                    log("Executing")
                    let newChip <- Buzz4.createChip(name: name, companyId:companyId, password: password)
                    self.collection.deposit(token: <- newChip)
                    log("Finished")
            
                
                }
            }`,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
      args: (arg, t) => [
        arg(name, t.String),
        arg(companyId, t.UInt64),
        arg(password, t.String),
      ],
    });
    // this.notify(transactionId);
    console.log("Buzz concluded chip creation sequence.");
  }

  // Edits public information
  static async edit_public_info(id, newContent) {
    console.log("Buzz started edit public info sequence.");
    console.log(newContent);
    const transactionId = await fcl.mutate({
      cadence: `

            import NonFungibleToken from 0x631e88ae7f1d7c20
            import Buzz4 from 0x5d572e6f1bd2f5da
            
            transaction(id: UInt64, newContent: {String: String}) {
            
                let collection: &Buzz4.Collection
            
                prepare(acct: AuthAccount) {
            
                    log("Starting")
                    self.collection = acct.borrow<&Buzz4.Collection>(from: /storage/BuzzCollection) ?? panic("Error")
                }
            
                execute{
                    log("Executing")
                    var chip = self.collection.borrowChip(id: id)
            
                    chip.editPublicData(info: newContent)
                    log("Finished")
            
                
                }
            }
            `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
      args: (arg, t) => [
        arg(id, t.UInt64),
        arg(newContent, t.Dictionary({ key: t.String, value: t.String })),
      ],
    });
    this.notify(transactionId);
    console.log("Buzz concluded edit public info sequence.");
  }

  // Edits private information
  static async edit_private_info(id, newContent, password) {
    console.log("Buzz started edit private info sequence.");
    const transactionId = await fcl.mutate({
      cadence: `

            import NonFungibleToken from 0x631e88ae7f1d7c20
            import Buzz4 from 0x5d572e6f1bd2f5da
            
            transaction(id: UInt64, newContent: String, password: String) {
            
                let collection: &Buzz4.Collection
            
                prepare(acct: AuthAccount) {
            
                    log("Starting")
                    self.collection = acct.borrow<&Buzz4.Collection>(from: /storage/BuzzCollection) ?? panic("Error")
                }
            
                execute{
                    log("Executing")
                    var chip = self.collection.borrowChip(id: id)
            
                    chip.editPrivateData(info: newContent, password: password)
                    log("Finished")
            
                
                }
            }
            
            `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
      args: (arg, t) => [
        arg(id, t.UInt64),
        arg(newContent, t.String),
        arg(password, t.String),
      ],
    });
    this.notify(transactionId);
    console.log("Buzz concluded edit private info sequence.");
  }

  // Edits name
  static async edit_name(id, newName) {
    console.log("Buzz started edit name sequence.");
    const transactionId = await fcl.mutate({
      cadence: `

            import NonFungibleToken from 0x631e88ae7f1d7c20
            import Buzz4 from 0x5d572e6f1bd2f5da
            
            transaction(id: UInt64, newName: String) {
            
                let collection: &Buzz4.Collection
            
                prepare(acct: AuthAccount) {
            
                    log("Starting")
                    self.collection = acct.borrow<&Buzz4.Collection>(from: /storage/BuzzCollection) ?? panic("Error")
                }
            
                execute{
                    log("Executing")
                    var chip = self.collection.borrowChip(id: id)
            
                    chip.editName(name: newName)
                    log("Finished")
            
                
                }
            }
            `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 1000,
      args: (arg, t) => [arg(id, t.UInt64), arg(newName, t.String)],
    });
    this.notify(transactionId);
    console.log("Buzz concluded edit name sequence.");
  }

  ////////////////////////
  // Scripts
  ////////////////////////

  // Get data about all chips on the account
  static async get_data_on_chips() {
    console.log("Buzz started get data on chips sequence.");
    const result = await fcl.query({
      cadence: `
                import NonFungibleToken from 0x631e88ae7f1d7c20
                import Buzz4 from 0x5d572e6f1bd2f5da
                                            
                pub fun main(account: Address): {UInt64:AnyStruct} {

                    let userAccount: PublicAccount = getAccount(account)

                    let collection = userAccount
                        .getCapability<&{Buzz4.BuzzCollectionPublic}>(/public/BuzzCollectionPublic)
                        .borrow()
                        ?? panic ("Could not borrow capability from the public Buzz4 Collection")

                    let a = collection.getInfo()

                    return a

                }
            `,
      args: (arg, t) => [arg(this.user?.addr, t.Address)],
    });
    console.log("Buzz concluded get data on chips sequence.");
    return result;
  }

  // Get public data on specific chip
  static async get_chip_public_data(id) {
    console.log("Buzz started get public data on chips sequence.");
    const response = await fcl.query({
      cadence: `
      import NonFungibleToken from 0x631e88ae7f1d7c20
                import Buzz4 from 0x5d572e6f1bd2f5da
                pub fun main(id: UInt64, account: Address): {String:AnyStruct} {

                    let userAccount: PublicAccount = getAccount(account)

                    let collection = userAccount
                        .getCapability<&{Buzz4.BuzzCollectionPublic}>(/public/BuzzCollectionPublic)
                        .borrow()
                        ?? panic ("Could not borrow capability from the public Buzz4 Collection")

                    let a = collection.borrowChip(id: id).getInfo()

                    return a

                }          
                `,
      args: (arg, t) => [arg(id, t.UInt64), arg(this.user?.addr, t.Address)],
    });
    console.log("Buzz concluded get public data on chips sequence.");
    return response;
  }

  // Get private data on specific chip
  //   Tested, ok
  static async get_chip_private_data(id) {
    console.log("Buzz started get data on chips sequence.");
    const response = await fcl.query({
      cadence: `
      import NonFungibleToken from 0x631e88ae7f1d7c20
      import Buzz4 from 0x5d572e6f1bd2f5da
      pub fun main(id: UInt64, account: Address): {String:AnyStruct} {

        let userAccount: PublicAccount = getAccount(account)

        let collection = userAccount
            .getCapability<&{Buzz4.BuzzCollectionPublic}>(/public/BuzzCollectionPublic)
            .borrow()
            ?? panic ("Could not borrow capability from the public Buzz4 Collection")

        let a = collection.borrowChip(id: id).getPrivateInfo()

        return a

    }          
                
                `,
      args: (arg, t) => [arg(id, t.UInt64), arg(this.user?.addr, t.Address)],
    });
    console.log("Buzz concluded get private data on chips sequence.");
    return response;
  }

  // Read private data on specific chip
  //   Tested, ok
  static async read_chip_private_data(id, address) {
    console.log("Buzz started read private data on chips sequence.");
    const response = await fcl.query({
      cadence: `
      import NonFungibleToken from 0x631e88ae7f1d7c20
      import Buzz4 from 0x5d572e6f1bd2f5da
      pub fun main(account: Address): {UInt64:AnyStruct} {

        let userAccount: PublicAccount = getAccount(account)

        let collection = userAccount
            .getCapability<&{Buzz4.BuzzCollectionPublic}>(/public/BuzzCollectionPublic)
            .borrow()
            ?? panic ("Could not borrow capability from the public Buzz4 Collection")

        let a = collection.borrowChip(id: id).userGetInfo()

        return a

    }          
                
                `,
      args: (arg, t) => [arg(id, t.UInt64), arg(address, t.Address)],
    });
    console.log("Buzz concluded read private data on chips sequence.");
    return response;
  }
}
