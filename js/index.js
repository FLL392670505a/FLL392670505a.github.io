var dividendsInstance;
var fllInstance;
var ticketsInstance;
var filInstance;
var filBase = 1000000000000000000
$(document).ready(function() {



    var BN = BigNumber.clone();
    var netCheck = false;
    var symbol;
    var web3 = window.web3;
    var myTickets;
    var fllFilBase = 1000000000000;
    var times;
    var defaultAccount = "";  //默认地址
    var isStart = false;
    var language = store.get("language");  //语言
    var lan_arr;   //语言列表
    var tipl;
    var invitationAddress;  //邀请地址
    var bppNum;
    var player;
    var referrer;
    var bigPoolPrize;   //大奖池数量
    var smallPoolPrize; //小奖池数量
    var bigPoolPrizeCount;  //大奖池轮数
    var smallPoolPrizeCount; //小奖池轮数
    var pccToUsdtRate;      //1FIL=FLL

    var parent;
    var pid;
    var userList;
    var countUser;
    var addBuyRecord;

    try {
        let r = new URLSearchParams(window.location.search).get('r');
        if (isNull(r)) {
            invitationAddress = "0x0000000000000000000000000000000000000000";
        } else {
            invitationAddress = r;
        }
        console.log("invitationAddress=", invitationAddress);
    } catch (e) {

    }
    var initLaguage = function() {
        if (!language) {
            language = "language_us"
        }
        $("ul.language-menu > li").click(function() {
            store.set("language", "language_" + $(this).attr("data-value"));
            window.location.reload()
        });
        if (!language) {
            lan_arr = language_us;
            tipl = tipl_language_us
        } else {
            try {
                lan_arr = eval(language);
                tipl = eval("tipl_" + language)
            } catch (err) {
                lan_arr = language_us;
                tipl = tipl_language_us
            }
        }
        for (var i = 0; i < lan_arr.length; i++) {
            $(".lan-" + (i + 1)).html(lan_arr[i])
        }
    };
    initLaguage();




    function getWeb3Version() {
        if (!web3) return "0.0";
        console.log(11111)
        console.log(window.ethereum)
        return (typeof web3.version == "string") ? web3.version : web3.version.api;
    }
    var checkNet = function() {
        if (isStart) {
            return
        }

        if (!window.ethereum) {
            try {
                var str = sessionStorage.getItem("ethereum");
                window.ethereum = JSON.parse(str);
            } catch (error) {
                console.error("window.ethereum recover failed");
            }
        }
        if (window.ethereum) {
            try {
                sessionStorage.setItem("ethereum", JSON.stringify(window.ethereum));
            } catch (error) {
                console.info("window.ethereum save failed", error);
            }
            if (!web3 || getWeb3Version() < "1.0") {
                $.get('web3.min.js', function(res) {
                    console.info("[web3]ajax:", res.length + "byte", new Date().toISOString());
                    Web3 = window.Web3 = undefined;
                    // web3 = window.web3 = undefined;
                    setTimeout(() => {
                        eval(res);
                        window.web3 = web3 = new Web3(ethereum);
                        console.info("[web3]reload:", getWeb3Version(), new Date().toISOString());
                        handlerWeb3(window.web3);
                    }, 618);
                });
            } else {
                handlerWeb3(window.web3);
            }
        } else {
            if (window.web3) {
                console.info("[web3]currentProvider:", window.web3, web3.currentProvider);
                web3 = window.web3 = new Web3(web3.currentProvider);
                isStart = true;
                handlerWeb3(window.web3);
            } else {
                alertify.error(tipl[2]);
            }
        }
    };

    var handlerWeb3 = function(web3) {
        dividendsInstance = new web3.eth.Contract(dividendsAbi, dividendsAddress);
        fllInstance = new web3.eth.Contract(pccAbi, pccAddress);
        ticketsInstance = new web3.eth.Contract(ticketAbi, ticketAddress);
        filInstance = new web3.eth.Contract(usdtAbi, usdtAddress);
        voteInstance = new web3.eth.Contract(voteAbi, voteAddress);
        web3.eth.net.getId(function(err, netId) {
            netCheck = true;
            checkLogin()
            // if (netId != gnetId) {
            //     if (gnetId == 3 || gnetId == 4) {
            //         alertify.error(tipl[0])
            //     }
            //     if (gnetId == 1) {
            //         alertify.error(tipl[1])
            //     }
            // } else {

            //     checkLogin()
            // }
        })

    };

    //用户登陆
    var checkLogin = function() {
        setInterval(function() {
            web3.eth.getAccounts(function(err, acc) {
                if (err != null) {
                    console.log("error");
                    return;
                }
                if (acc.length == 0 && defaultAccount != "") {
                    window.location.reload();
                    return;
                }
                if (acc.length == 0) {
                    return;
                }
                if (acc[0] != defaultAccount) {
                    defaultAccount = acc[0];
                    window.location.reload();
                    console.log("account change, start bat updateData!")
                }
            })
        }, 1000);

        web3.eth.getAccounts(async function(err, accounts) {
            if (err) {
                alertify.error(err);
                return;
            }
            if (accounts.length == 0) {
                alertify.error(tipl[3]);
                return;
            }
            defaultAccount = accounts[0];
            console.log("defaultAccount: ", defaultAccount);

            if (defaultAccount != '') {
                $('.loadHidden').hide();
                $('.loadHiddenContent').hide();
                await initSmallPoolPrize();
                await initBigPoolPrize();
                await initPlayer();
                setPccToUsdtRate();
                getSmallPoolList();
                getBigPoolList();
                initDividendsBalance();
                checkVoteView();
                //同步用户数据了
                getNum();
            }
        })
    };

    function initDividendsBalance() {
        filInstance.methods.balanceOf(dividendsAddress).call().then(res => {
            $('#dividendsBalance').html(BN(res / (10 ** 18)).toFixed(6));
        }).catch(err => {
            console.log(err);
            return;
        });
    }

    async function refreshPlayer() {
        await ticketsInstance.methods.getPlayerInfo().call({
            from: defaultAccount
        }).then(res => {
            player = res;
        }).catch(err => {
            console.log(err);
            return;
        });
    }

    async function initPlayer() {
        await refreshPlayer();
        if (player[1] > 0) {
            await ticketsInstance.methods.getReferrerById(player[1]).call().then(res2 => {
                referrer = res2;
            }).catch(err => {
                console.log(err);
                return;
            });
        }
        isShowRegister();
        dividendsInstance.methods.getDirectPushs(player[0]).call().then(re3 => {
            $(".my-recomand-count").html(re3.length);
        }).catch(err => {
            console.log(err);
            return;
        });
        getUserProfit();
        updateIntiveLink();
        isShowSettleAmbassador();
    }

    async function initSmallPoolPrize() {
        await dividendsInstance.methods.smallPrizePoolCount().call().then(async smallCount => {
            smallPoolPrizeCount = smallCount;
            await dividendsInstance.methods.getPrizePool(1, smallCount).call().then(res => {
                smallPoolPrize = res;
                smallCountDown();
            }).catch(err => {
                console.log(err);
                return;
            });
        }).catch(err => {
            console.log(err);
            return;
        });
    }

    async function initBigPoolPrize() {
        await dividendsInstance.methods.bigPrizePoolCount().call().then(async bigCount => {
            bigPoolPrizeCount = bigCount;
            await dividendsInstance.methods.getPrizePool(2, bigCount).call().then(res => {
                bigPoolPrize = res;
                bigCountDown();
            }).catch(err => {
                console.log(err);
                return;
            });
        }).catch(err => {
            console.log(err);
            return;
        });
    }

    function isShowSettleAmbassador() {
        if (player[0] > 0 && player[15] == 1 && player[6] > 0) {
            $("#settleAmbassador").removeClass("hidden");
        } else {
            $("#settleAmbassador").addClass("hidden");
        }
    }

    $("#settleAmbassador").click(function() {
        ticketsInstance.methods.settleAmbassador().send({
            from: defaultAccount,
            gas: 1500000
        }).then(res => {

            window.location.reload();
        }).catch(err => {
            console.log(err);
            return;
        });
    });


    function getUserProfit() {
        $(".p-gen").html((player[21] / filBase).toFixed(2));
        $(".p-dy").html((player[22] / filBase).toFixed(2));
        $(".p-win").html((player[23] / filBase).toFixed(2));

        let tempTime = 0;
        let investTime = player[11];
        let nowTime = Math.round(new Date().getTime() / 1000);
        let diffTime = Number(nowTime) - Number(investTime);
        let unIncome1 = 0;
        let unIncome2 = 0;

        let settledDays = player[20];
        if (player[4] > 0 && player[14] == 0) {
            let isFuse = 0;
            let fuseTime = 0;
            if (bigPoolPrizeCount > 0) {
                isFuse = bigPoolPrize[6];
                fuseTime = bigPoolPrize[7];
            }

            if (player[24] == 0) {
                if (player[11] <= fuseTime) {

                } else {
                    if (diffTime < oneDay) {
                        tempTime = Number(investTime) + oneDay - Number(nowTime);
                    } else {
                        let num = Number(parseInt(diffTime / (oneDay))) + 1;
                        tempTime = Number(investTime) + oneDay * num - Number(nowTime);
                    }
                    if (diffTime >= oneDay) {
                        let incomeNum = parseInt(diffTime / oneDay);
                        let unIncomeDays = Number(incomeNum) - Number(settledDays);
                        if (unIncomeDays > 0) {
                            unIncome1 = player[4] / filBase * 0.3 / 100 * unIncomeDays;
                            unIncome2 = player[4] / filBase * 2.2 / 100 * unIncomeDays;
                        }
                    }

                }
            } else if (player[24] == 2) {
                if (player[25] <= fuseTime) {

                } else {
                    let diffTime3 = Number(nowTime) - Number(player[25]);
                    if (diffTime3 < oneDay) {
                        tempTime = Number(player[25]) + oneDay - Number(nowTime);
                    } else {
                        let num = Number(parseInt(diffTime3 / oneDay)) + 1;
                        tempTime = Number(player[25]) + oneDay * num - Number(nowTime);
                    }
                    if (diffTime3 >= oneDay) {
                        let incomeNum = parseInt(diffTime3 / oneDay);
                        let unIncomeDays = Number(incomeNum) - Number(settledDays);
                        if (unIncomeDays > 0) {
                            unIncome1 = player[4] / filBase * 0.3 / 100 * unIncomeDays;
                            unIncome2 = player[4] / filBase * 2.2 / 100 * unIncomeDays;
                        }
                    }

                }
            }
        }
        refreshIncomeTimer(tempTime);
        $(".pext-incomeper").html(unIncome1.toFixed(0) + "~" + unIncome2.toFixed(0));

        let temp;
        if (usdtConvert(2) <= player[6] && player[6] < usdtConvert(4)) {
            temp = 3;
        } else
            if (usdtConvert(4) <= player[6] && player[6] < usdtConvert(6)) {
            temp = 4;
        } else if (player[6] >= usdtConvert(6)) {
            temp = 5;
        }
        $(".pext-incometimes").html(temp);

        $(".pext-incomecan").html((Number((player[12]) - Number(player[5])) / filBase).toFixed(0));

        $(".node-gen").html(((Number(player[21]) + Number(player[22])) / filBase).toFixed(2));

        $(".p-unwithdraw").html((player[17] / filBase).toFixed(2));

        $(".p-teth").html((player[6] / filBase).toFixed(2));

        $(".p-tstc").html((player[16] / filBase).toFixed(2));

        $(".p-tdy").html((player[9] / filBase).toFixed(2));

        $(".pext-teamgen").html((player[7] / filBase).toFixed(2));

        $(".pext-anglegen").html((player[8] / filBase).toFixed(2));


        if (smallPoolPrize[5] == 1) {
            $(".s-pot").html("0.00");
        } else {
            $(".s-pot").html((smallPoolPrize[1] / filBase).toFixed(2));
        }

        checkFusingState(bigPoolPrizeCount);
        if (bigPoolPrize[5] == 1) {
            $(".b-pot").html("0.00");
        } else {
            $(".b-pot").html((bigPoolPrize[1] / filBase).toFixed(2));
        }
    }

    function checkFusingState() {
        fuseTime = bigPoolPrize[7];
        if (bigPoolPrize.length > 0 && fuseTime > 0) {
            $('.vote').removeClass('hidden');
            voteInstance.methods.gettotalVoteNum().call({
                from: defaultAccount
            }).then(bal => {
                let pccValue = web3.utils.fromWei(bal + "", "ether");
                $('.votePccBalance').html(pccValue);
            }).catch(err => {
                console.log(err);
                return;
            });
        }
    }

    function smallCountDown() {
        $('.s-loop').html(smallPoolPrizeCount);
        if (smallPoolPrizeCount > 0) {
            let nowTime = Math.round(new Date().getTime() / 1000);
            let drawTime = Number(smallPoolPrize[4]);
            if (drawTime == 0) {
                refreshTimer24(0);
            } else {
                if (smallPoolPrize[5] == 0 && nowTime < drawTime) {
                    refreshTimer24(Number(drawTime) - Number(nowTime));
                } else {
                    refreshTimer24(0);
                }
            }
        } else {
            refreshTimer24(0);
        }
    }

    function bigCountDown() {
        $('.b-loop').html(bigPoolPrizeCount);
        if (bigPoolPrizeCount > 0) {
            if (bigPoolPrize[4] == "160457327300000") {
                refreshBigTimer(0);
            } else {
                let nowTime = Math.round(new Date().getTime() / 1000);
                let drawTime = Number(bigPoolPrize[4]);
                if (bigPoolPrize[5] == 0 && nowTime < drawTime) {
                    refreshBigTimer(Number(drawTime) - Number(nowTime));
                } else {
                    refreshBigTimer(0);
                }
            }
        } else {
            refreshBigTimer(0);
        }
    }

    var t1;
    var t2;
    var refreshBigTimer = function(senconds) {
        if (senconds > 0) {
            if (t1) {
                t1.clear()
            }
            t1 = new Tick(senconds, ".b-dtime");
            t1.timer(t1)
        } else {
            $(".b-dtime").html(tipl[20])
        }
    };
    var refreshTimer24 = function(senconds) {
        if (senconds > 0) {
            if (t2) {
                t2.clear()
            }
            t2 = new Tick(senconds, ".b-dtime24");
            t2.timer(t2)
        } else {
            $(".b-dtime24").html(tipl[20])
        }
    };

    var t3;
    var refreshIncomeTimer = function(senconds) {
        if (senconds > 0) {
            if (t3) {
                t3.clear()
            }
            t3 = new Tick(senconds, ".pext-incomenext");
            t3.timer(t3)
        } else {
            $(".pext-incomenext").html("--:--:--")
        }
    };

    var updateIntiveLink = function() {
        var url = location.href;
        if (url.indexOf("?") != -1) {
            url = url.split("?")[0]
        }
        var g = defaultAccount;
        if (g) {
            if ($("#invite-link").html().trim() == "--") {
                $("#invite-link").html(url + "?r=" + g)
            }
        }
    };


    function isShowRegister() {
        if (player[1] > 0) {
            let arr = referrer[0];
            let addr = referrer[1];
            $("#regisRecommender").html(addr);
            $("#regisRecommenderPoint").removeClass("hidden");
            $("#regisRecommender").css("color", "red");

            $(".my-inviter").html(addr);
        } else {
            let temp = "-"
            if (!isNull(invitationAddress) && invitationAddress != "0x0000000000000000000000000000000000000000") {
                temp = invitationAddress
            }
            $("#regisRecommender").html(temp);
            $("#regisRecommender").css("color", "green");
        }

    }

    function setPccToUsdtRate() {
        ticketsInstance.methods.getFllToFiltRate().call().then(res => {
            pccToUsdtRate = BN(res).div(BN(fllFilBase)) ;
            var _res =(BN(1).div(pccToUsdtRate)).toFixed(2);

            $(".ticket-stsinput").html(_res);
            $(".ticket-stsinput_").html(_res);
        }).catch(err => {
            console.log(err);
        });
        fllInstance.methods.balanceOf(ticketAddress).call().then(res => {
            $('.ticketPccBal').html(BN(res).div(BN(10 ** 18)).toFixed());
        });
		filInstance.methods.balanceOf(ticketAddress).call().then(res => {
		    $('.ticketUsdtBal').html(BN(res).div(BN(10 ** 18)).toFixed());
		});
    }

    $('#amount').bind('input propertychange', function() {
        calPCC();
    });

    function calPCC() {
        var ethinputVal = $(".ethinput").val();
        var ethinputVal_ = parseInt(ethinputVal / pccToUsdtRate/10)
        console.log(ethinputVal_)
        $("#exchangePCC").html((ethinputVal_));
    }

    //参与门票合约
    $(".buywitheth").click(async function() {
        if (defaultAccount == invitationAddress) {
            alertify.error(tipl[32]);
            return;
        }
        if (!checkAll()) {
            return
        }

        if ($(".ethinput").val() < 1) {
            alertify.error(tipl[7]);
            return
        }
        if (!checkTicket($(".ethinput").val())) {
            return
        }

        var usdtEtherValue1 = $(".ethinput").val();

        var usdtEtherValue =web3.utils.toWei(usdtEtherValue1, "ether")

        var regNumber = /^[0-9]{1,10}$/;
        if (!regNumber.test(usdtEtherValue1)) {
            alertify.error(tipl[33]);
            return;
        }

        await refreshPlayer();
        let investAmt = player[4];

        if (investAmt > 0) {
            alertify.error(tipl[28]);
            return;
        }


        let usdtBalance = 0;
        await filInstance.methods.balanceOf(defaultAccount).call().then(balance => {
            usdtBalance = balance;
        }).catch(err => {
            console.log(err);
            return;
        });

        if (parseFloat(usdtBalance/filBase) < parseFloat(usdtEtherValue/filBase)) {
            alertify.error("FIL " + tipl[34]);
            return;
        }

        let rate = pccToUsdtRate;

        let pcc = usdtEtherValue1/rate/10;

        console.log(pcc)

        let pccValue = web3.utils.toWei(pcc + "", "ether");
        console.log(pccValue)
        let pccBalance = 0;
        await fllInstance.methods.balanceOf(defaultAccount).call().then(balance => {
            pccBalance = balance;
        }).catch(err => {
            console.log(err);
            return;
        });

        if (Number(pccBalance) < Number(pccValue)) {
            alertify.error("FLL " + tipl[34]);
            return;
        }

        try {

            filInstance.methods.allowance(defaultAccount, dividendsAddress).call().then(async res => {
                if (res > 0) {
                    await filInstance.methods.approve(dividendsAddress, 0).send({
                        from: defaultAccount,
						gas:1200000
                    }, function(err, res) {});
                }
                fllInstance.methods.approve(dividendsAddress, Math.ceil(pccValue) + "").send({
                    from: defaultAccount,
					gas:1200000
                }, function(err1, res1) {
                    if (!err1) {
                        filInstance.methods.approve(dividendsAddress, usdtEtherValue).send({
                            from: defaultAccount,
							gas:1200000
                        }, function(err2, res2) {
                            if (!err2) {
                                console.log(res2)
                                  console.log(usdtEtherValue)
                                   console.log(invitationAddress)
                                dividendsInstance.methods.investment(usdtEtherValue, invitationAddress).send({
                                    from: defaultAccount,
                                    gas: 2500000
                                }).then(async res3 => {
                                    // 写入用户参与记录
                                    // 注册用户
                                    await getNum()
                                    window.location.reload();
                                }).catch(err => {
                                    console.log(err);
                                });
                            }
                        });
                    }
                });
            }).catch(err => {
                console.log(err);
            });
        } catch (e) {
            console.log(e);
        }
    });

    var checkTicket = function(inputCount) {
        var needCount;
        if ((needCount = checkTicket0(myTickets, inputCount, times)) != 0) {
            alertify.error(tipl[11] + needCount + " " + symbol);
            return false
        }
        return true
    };
    var checkTicket0 = function(_myTickets, _eth, _times) {
        if (_times && _myTickets) {
            var val = BN(_myTickets).comparedTo(BN(_eth).times(BN(_times)));
            if (val == -1) {
                return BN(_eth).times(BN(_times)).toFixed()
            }
        }
        return 0
    };

    var checkAll = function() {
        if (!defaultAccount || defaultAccount == "") {
            alertify.error(tipl[3]);
            return;
        }
        return true;
    };

    var noWeb3 = function() {
        alertify.error(tipl[2])
    };
    var errNet = function() {
        alertify.error(tipl[4])
    };


    $("#buy-ticket-action").click(async function() {
        if (!checkAll()) {
            return
        }

        try {
            var pcc = $(".ticket-stsinput").html();
            console.log(pcc)
            if (pcc < 1) {
                alertify.error(tipl[18] + " 1FLL");
                return
            }

            var usdtEtherValue = $(".ticket-ethinput").val();
            console.log(usdtEtherValue)
            usdtEtherValue = web3.utils.toWei(usdtEtherValue, "ether");


            let usdtBalance = 0;
            await filInstance.methods.balanceOf(defaultAccount).call().then(async balance => {
                usdtBalance = balance;
				console.log(usdtBalance)
            }).catch(err => {
                console.log(err);
                return;
            });
            if (Number(usdtBalance) < Number(usdtEtherValue)) {
                alertify.error("FIL " + tipl[34]);
                return;
            }

            filInstance.methods.allowance(defaultAccount, ticketAddress).call().then(async res => {
                if (res > 0) {
                    await filInstance.methods.approve(ticketAddress, 0).send({
                        from: defaultAccount
                    }, function(err, res) {});
                }
                filInstance.methods.approve(ticketAddress, usdtEtherValue).send({
                    from: defaultAccount
                }, function(err, res) {
                    if (!err) {
                        console.log(usdtEtherValue)
                        ticketsInstance.methods.buyTicket(usdtEtherValue).send({
                            from: defaultAccount,
                            gas: 1200000
                        }).then(res => {
                            window.location.reload();
                        }).catch(err => {
                            console.log(err);
                        });
                    }
                });
            });
        } catch (err) {
            console.log(err);
            alertify.error(tipl[19])
        }
    });

    $("#recharge-ticket-action").click(async function() {
        var aInput = $(".ticket-ethinput").val();
        var regNumber = /^[0-9]{1,10}\.{0,1}\d{0,2}$/;
        if (!regNumber.test(aInput)) {
            alertify.error(tipl[35]);
            return;
        }

        try {
            var rate = pccToUsdtRate;
            var pcc = $(".ticket-ethinput").val();
            if (pcc * rate < 5000) {
                alertify.error(tipl[29]);
                return
            }
            var pccEtherValue = web3.utils.toWei(pcc, "ether");

            let pccBalance = 0;
            await fllInstance.methods.balanceOf(defaultAccount).call().then(balance => {
                pccBalance = balance;
            }).catch(err => {
                console.log(err);
                return;
            });
            pccBalance = web3.utils.fromWei(pccBalance, "ether");
            if (Number(pccBalance) < Number(pcc)) {
                alertify.error("FLL " + tipl[34]);
                return;
            }

            fllInstance.methods.approve(ticketAddress, pccEtherValue).send({
                from: defaultAccount
            }, function(err, res) {
                if (!err) {
                    ticketsInstance.methods.recharge(pccEtherValue).send({
                        from: defaultAccount,
                        gas: 1200000
                    }).then(res => {
                        window.location.reload();
                    }).catch(err => {
                        console.log(err);
                    });
                }
            })
        } catch (err) {
            console.log(err);
            alertify.error(tipl[19])
        }
    });

    $(".ticket-ethinput").on("input", function(e) {
        var val = e.delegateTarget.value;
        $(".ticket-stsinput").html(BN(val).times($(".ticket-stsinput_").html()).toFixed(5));
    });

    $("#pext-incomeper").click(async function() {
        ticketsInstance.methods.settleStatic().send({
            from: defaultAccount,
            gas: 1200000
        }).then(function(res) {
            window.location.reload();
        }).catch(err => {
            console.log(err);
        });
    });

    var init = function() {
        $("#ic-input1").click(function() {
            $("#amount").val(2);
            calPCC();
        });
        $("#ic-input11").click(function() {
            $("#amount").val(4);
            calPCC();
        });
        $("#ic-input31").click(function() {
            $("#amount").val(6);
            calPCC();
        });
        window.addEventListener('load', async () => {

        });
        var clipboard = new ClipboardJS("#share-link");
        clipboard.on("success", function(e) {
            e.clearSelection();
            alertify.success(tipl[5] + " " + e.text)
        });
        checkNet();
    };


    $("#performance").click(async function() {
        await refreshPlayer();
        if ((Number(player[21]) + Number(player[22])) == 0) {
            alertify.error(tipl[41]);
            return;
        }

        dividendsInstance.methods.withdrawPerBalance().send({
            from: defaultAccount,
            gas: 800000
        }).then(function(res) {
            window.location.reload();
        }).catch(err => {
            console.log(err);
        });
    });

    $("#parterWd").click(async function() {
        await refreshPlayer();
        if (Number(player[17]) == 0) {
            alertify.error(tipl[42]);
            return;
        }
        dividendsInstance.methods.withdrawWinBalance().send({
            from: defaultAccount,
            gas: 800000
        }).then(function(res) {
            window.location.reload();
        }).catch(err => {
            console.log(err);
        });
    });

    $("#teamBalance").click(async function() {
        await refreshPlayer();
        if (Number(player[7]) == 0) {
            alertify.error(tipl[43]);
            return;
        }
        dividendsInstance.methods.withdrawTeamBalance().send({
            from: defaultAccount,
            gas: 800000
        }).then(function(res) {
            window.location.reload();
        }).catch(err => {
            console.log(err);
        });
    });


    $("#ambassador").click(async function() {
        await refreshPlayer();
        if (Number(player[8]) == 0) {
            alertify.error(tipl[44]);
            return;
        }
        dividendsInstance.methods.withdrawAmbassBalance().send({
            from: defaultAccount,
            gas: 800000
        }).then(function(res) {
            window.location.reload();
        }).catch(err => {
            console.log(err);
        });
    });


    $("#viewMySts").click(function() {
        if (defaultAccount != null && defaultAccount != "") {
            location.target = "_blank";
            location.href = "./my.html?defaultAccount=" + defaultAccount
        }
    });
    $("#toWithdrawId").click(async function() {
        let isFuse = bigPoolPrize[6];
        let fuseTime = bigPoolPrize[7];
        let rebootTime = bigPoolPrize[8];

        let numZero = 0;
        let notTick = 0;


            voteInstance.methods.withdraw().send({
                from: defaultAccount
            })
            .on('transactionHash', function(hash){

                alertify.success('操作成功,请等待处理！')
            })
            .on('receipt', function(receipt){
                console.log(receipt)
            })
            .on('confirmation', function(confirmationNumber, receipt){
                alertify.success('操作成功！')
                setTimeout(function () {
                    window.location.reload();
                },2500)

            })
            .on('error', function(error){
                return;
            })
        if (notTick == 1) {
            alertify.error(tipl[48]);
            return;
        }

    });

    function checkVoteView() {
        let isFuse = bigPoolPrize[6];
        let fuseTime = bigPoolPrize[7];
        let rebootTime = bigPoolPrize[8];
        console.log(isFuse, fuseTime, rebootTime);
        if (isFuse == 1 || (isFuse == 0 && rebootTime > 0)) {
            $("#voteDiv").removeClass("hidden");
        }
    };

    $("#toTrans").click(function() {
        tranfersDividends();
    });
    //同步用户数据
    //接口注册用户
    async function regInfo(userList){
        let _this =this
        $.ajax({
            url: url+'admin/address/register',
            headers: {'language':'cn'},
            type: "post",
            data:userList,
            dataType: "json",
            success: function (res) {

            }
        });

    };
    //调用合约
    async function regUserByConcant(){
        let _this =this;
        await dividendsInstance.methods.getSmallPlayer(smallPoolPrizeCount).call().then(async function(res) {
            userList=[];
            let idList = res[0];
            let idArr = new Array();
            for (let n = 0; n < idList.length; n++) {
                idArr[n] = idList[n];
            }
            let amountList = res[1];
            let amountArr = new Array();
            for (let n = 0; n < amountList.length; n++) {
                amountArr[n] = amountList[n];
            }
            let timeList = res[2];

            let length = 31;
            if (idArr.length < 31) {
                length = idArr.length;
            }
            for (let i = 0; i < length - 1; i++) {
                let max = amountArr[i];
                let minTime = timeList[i];
                let maxIndex = i;
                for (let j = i + 1; j < idArr.length; j++) {
                    if (max / 1000000 < amountArr[j] / 1000000) {
                        max = amountArr[j];
                        minTime = timeList[j];
                        maxIndex = j;
                    } else if (max / 1000000 == amountArr[j] / 1000000) {
                        if (Number(minTime) > Number(timeList[j])) {
                            max = amountArr[j];
                            minTime = timeList[j];
                            maxIndex = j;
                        }
                    }
                }
                if (maxIndex != i) {
                    [idArr[i], idArr[maxIndex]] = [idArr[maxIndex], idArr[i]];
                    [amountArr[i], amountArr[maxIndex]] = [amountArr[maxIndex], amountArr[i]];
                }
            }
            console.log(idArr)
            for (let i = 0; i < idArr.length; i++) {
                await ticketsInstance.methods.getReferrerById(idArr[i]).call().then(async function(res) {
                    await getParent(res[0]);
                    let addr = res[1];
                    // let len = addr.length
                    userList={
                        address:'',
                        chainId:'',
                        pid:'',
                    };
                    userList.chainId = idArr[i];
                    userList.address = addr;
                    userList.pid = pid;

                    addBuyRecord = {
                        address:'',
                        id:'',
                        amount:'',
                        amountTotal:'',
                        smallNum:smallPoolPrize
                    };
                    addBuyRecord.address = addr
                    addBuyRecord.id = idArr[i];
                    addBuyRecord.amount =(amountArr[i] / 1000000).toFixed(0);
                    addBuyRecord.amountTotal = (res[0][6] / 1000000).toFixed(0);

                    if(userList.chainId>0&&countUser<userList.chainId){
                        await regInfo(userList)
                    }
                    if(addBuyRecord.amount>0){
                        await fAddBuyRecord(addBuyRecord)
                    }
                });
            }

        }).catch(err => {
            console.log(err);
        });
    };
    // 获取上级
    async function getParent(player) {
        if (player[1] > 0) {
            await ticketsInstance.methods.getReferrerById(player[1]).call().then(res2 => {
                parent = res2[1];
                pid=res2[0][0]
            }).catch(err => {
                parent ='';
                pid=0;
                console.log(err);
                return;
            });
        }else{
            parent ='';
            pid=0;
            return;
        }
    };
    // 获取已经同步的数据
    //接口注册用户
    async function getNum(){
        let _this =this
        $.ajax({
            url: url+'admin/address/addressCount',
            headers: {'language':'cn'},
            type: "get",
            data:{

            },
            dataType: "json",
            success: function (res) {
                console.log(res)
                if(res.code==200){
                    countUser = res.data
                    regUserByConcant();
                    // getCount()
                }
            }
        });

    };
    //合约获取数据
    async function getCount(){
        let _this = this;
        let info;
        dividendsInstance.methods._playerCount(bigPoolPrizeCount).call().then(async count => {
            if (count > 0) {
                for (var i = countUser; i <= count; i++) {
                    if(i==0){
                        continue;
                    }
                    await ticketsInstance.methods.getReferrerById(i).call().then(async function(res) {
                        console.log(res)
                        await getParent(res[0]);
                        let addr = res[1];
                        userList={
                            address:'',
                            chainId:'',
                            pid:'',
                        };
                        userList.chainId = i;
                        userList.address = addr;
                        userList.pid = pid;
                    });
                    addBuyRecord = {
                        address:'',
                        id:'',
                        amount:'',
                        amountTotal:'',
                        smallNum:smallPoolPrize
                    };
                    addBuyRecord.address = addr
                    addBuyRecord.id = i
                    addBuyRecord.amount =(res[0][4] / 1000000).toFixed(0);
                    addBuyRecord.amountTotal = (res[0][6] / 1000000).toFixed(0);
                    if(userList.chainId>0){
                        await regInfo(userList)
                    }
                    if(addBuyRecord.amount>0){
                        await fAddBuyRecord(addBuyRecord)
                    }

                }
            }
        }).catch(err => {
            console.log(err);
            return;
        });
    };
    //写入参与数据
    async function fAddBuyRecord(data){
        let _this =this
        $.ajax({
            url: url+'admin/buyRecord/addBuyRecord',
            headers: {'language':'cn'},
            type: "post",
            data:data,
            dataType: "json",
            success: function (res) {

            }
        });

    };
    // 初始化
    init();

});



function getPoolList(type) {
    addLoading();
    if (type == "small") {
        $(".bigs").addClass("hidden");
        $(".small").removeClass("hidden");
        getSmallPoolList()
    } else {
        $(".bigs").removeClass("hidden");
        $(".small").addClass("hidden");
        getBigPoolList()
    }
    removeLoading();
}


function getSmallPoolList() {
    dividendsInstance.methods.getSmallPlayer(1).call().then(async function(res) {
        let idList = res[0];
        let idArr = new Array();
        for (let n = 0; n < idList.length; n++) {
            idArr[n] = idList[n];
        }
        let amountList = res[1];
        let amountArr = new Array();
        for (let n = 0; n < amountList.length; n++) {
            amountArr[n] = amountList[n];
        }
        let timeList = res[2];

        let length = 31;
        if (idArr.length < 31) {
            length = idArr.length;
        }
        for (let i = 0; i < length - 1; i++) {
            let max = amountArr[i];
            let minTime = timeList[i];
            let maxIndex = i;
            for (let j = i + 1; j < idArr.length; j++) {
                if (max / filBase < amountArr[j] / filBase) {
                    max = amountArr[j];
                    minTime = timeList[j];
                    maxIndex = j;
                } else if (max / filBase == amountArr[j] / filBase) {
                    if (Number(minTime) > Number(timeList[j])) {
                        max = amountArr[j];
                        minTime = timeList[j];
                        maxIndex = j;
                    }
                }
            }
            if (maxIndex != i) {
                [idArr[i], idArr[maxIndex]] = [idArr[maxIndex], idArr[i]];
                [amountArr[i], amountArr[maxIndex]] = [amountArr[maxIndex], amountArr[i]];
            }
        }

        let html = "";
        for (let i = 0; i < idArr.length; i++) {
            await ticketsInstance.methods.getReferrerById(idArr[i]).call().then(function(res) {
                let addr = res[1];
                let len = addr.length
                addr = addr.substring(0, 6) + "..." + addr.substring((len - 4), len);
                html += "<div class=\"col-md-12 col-xs-12 col-sm-12 col-md-12\" style=\"display: flex;flex-flow: nowrap;justify-content: space-between;align-items: center;line-height: 30px;\">" +
                    "<div class=\"col-xs-6 text-left\">" + addr + "</div>" +
                    "<div class=\"col-xs-6 text-right\">" + (amountArr[i] / filBase).toFixed(0) + "</div>" +
                    "</div>";
            });
        }
        $('#minArrays').html("");
        $('#minArrays').append(html);
    }).catch(err => {
        console.log(err);
    });
}


function getBigPoolList() {
    dividendsInstance.methods.getSmallPlayer(2).call().then(async function(res) {
        let idList = res[0];
        let idArr = new Array();
        for (let n = 0; n < idList.length; n++) {
            idArr[n] = idList[n];
        }
        let amountList = res[1];
        let amountArr = new Array();
        for (let n = 0; n < amountList.length; n++) {
            amountArr[n] = amountList[n];
        }
        let timeList = res[2];


        let startIndex = 0;
        if (idArr.length > 500) {
            startIndex = idArr.length - 500;
        }


        let maxAmt = amountArr[startIndex];
        let minTime = timeList[startIndex];
        let maxIndex = startIndex;
        for (let n = startIndex + 1; n < idArr.length; n++) {
            if (maxAmt / filBase < amountArr[n] / filBase) {
                maxAmt = amountArr[n];
                minTime = timeList[n];
                maxIndex = n;
            } else if (maxAmt / filBase == amountArr[n] / filBase) {
                if (minTime > timeList[n]) {
                    maxAmt = amountArr[n];
                    minTime = timeList[n];
                    maxIndex = n;
                }
            }
        }

        let html = "";
        await dividendsInstance.methods.getAddrById(idArr[maxIndex]).call().then(function(res) {
            let addr = res;
            let len = addr.length;
            addr = addr.substring(0, 6) + "..." + addr.substring((len - 4), len);
            html += "<div class=\"col-md-12 col-xs-12 col-sm-12 col-md-12\" style=\"display: flex;flex-flow: nowrap;justify-content: space-between;align-items: center;line-height: 30px;\">" +
                "<div class=\"col-xs-6 text-left\">" + addr + "</div>" +
                "<div class=\"col-xs-6 text-right\">" + (maxAmt / filBase).toFixed(0) + "</div>" +
                "</div>";
        });
        $('#maxArrays').html("");
        $('#maxArrays').append(html);
    }).catch(err => {
        console.log(err);
    });
}

function addLoading() {
    $(".loading").show();
}

function removeLoading() {
    $(".loading").hide();
}
