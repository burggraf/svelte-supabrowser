<script lang="ts">

    import IonPage from "$ionic/svelte/components/IonPage.svelte";
    import { params, goto } from "@roxi/routify";
    import "https://unpkg.com/xterm@4.19.0/lib/xterm.js";

    import "$lib/libv86.js";
    // import { createIDBStorage } from "@eight04/idb-storage";
    import * as idbStorage from "@eight04/idb-storage";
import type { IonSelect } from "@ionic/core/components";
    // import "$lib/idb-storage.min.js"

    // $:folder = $params.folder;
    const boot = $params.boot;
    let read_file_name = "";
    const xionViewWillEnter = () => {
        console.log("Page:ionViewWillEnter");
    };
    var emulator;
        let config = {
            font_size: 15,
            memory_size: 128,
            save_filename: "state.bin"
            // vga_memory_size: 2,
        }
        const storage = idbStorage.createIDBStorage({
            name: "state-storage",
            conflicAction: "replace"
        });

        const ionViewDidEnter = () => {
            console.log("Page:ionViewWillEnter");
            const saved_config = localStorage.getItem('config');
            try {
                if (saved_config) {
                    config = JSON.parse(saved_config);
                    console.log('config loaded from localStorage', config);
                }
            } catch (err) {
                console.error('error restoring config from localStorage', err);
            }
            // let memorysizeElement = document.getElementById("memorysize");
            // console.log('memorysizeElement', memorysizeElement);
            console.log('0001');
            console.log('config.memory_size', config.memory_size);
            
            // memorysizeElement.value = config.memory_size;
            // console.log('0002');
            

            // (document.getElementById("fontsize") as any).value = config.font_size;
            // (document.getElementById("save_filename") as any).value = config.save_filename || "state.bin";
            console.log('0003')
            console.log('screen_container', document.getElementById("screen_container"))
            console.log('terminal', document.getElementById("terminal"))
            const baseOptions = {
                wasm_path: `v86.wasm`,
                memory_size: config.memory_size * 1024 * 1024,
                filesystem: {
                    basefs: "filesystem/filesystem.json",
                    baseurl: "filesystem/",
                },
                screen_container: document.getElementById("screen_container"),
                serial_container_xtermjs: document.getElementById("terminal"),
                network_relay_url: "wss://relay.widgetry.org/", // For non localhost: wss://relay.widgetry.org/
                //network_relay_url: "ws://:8080/",
                autostart: true,
                disable_keyboard: true,
                disable_mouse: true,
                disable_speaker: true,
                acpi: true,
            };

            // get searchParams
            const params = new URLSearchParams(window.location.search);
            // const params = (new URL(document.location)).searchParams;

            if (boot) {
                (document.getElementById("screen_container") as any).style = 'display:block';
                // document.getElementById("terminal").style = '';
            }

            const options = {
                ...baseOptions,
                ...(boot ? {
                    bzimage: {
                        url: "./filesystem/2e5f5126.bin"
                    },
                    cmdline: [
                        "rw",
                        "root=host9p rootfstype=9p",
                        "rootflags=version=9p2000.L,trans=virtio,cache=loose",
                        "quiet acpi=off console=ttyS0",
                        "tsc=reliable mitigations=off random.trust_cpu=on",
                        "nowatchdog page_poison=on",
                    ].join(" "),
                    bios: {
                        url: "./system/seabios.bin",
                    },
                    vga_bios: {
                        url: "./system/vgabios.bin",
                    },
                } : {
                    initial_state: {
                        url: "./state/state-" + config.memory_size + ".bin.zst"
                    }
                })
            };

            emulator = new V86Starter(options);

            if (boot) {
                // let the user watch the boot process
                (document.getElementById("terminal") as any).style = 'filter: none;';

                function handleBoot(line) {
                    console.log('handleBoot =>', line);
                    if (line.startsWith("server started")) {
                        emulator.remove_listener(handleBoot);
                        setTimeout(() => {
                            emulator.serial0_send('\\!/etc/init.d/S40network restart\n');
                            emulator.serial0_send('psql -U postgres\n');
                            emulator.serial0_send('\\! echo "boot_completed"; reset\n');
                            setTimeout(() => {
                                (document.getElementById("terminal") as any).style = 'filter: none;';
                                (document.getElementById("screen_container") as any).style =
                                    'display: none;';
                                emulator.serial_adapter.term.focus();
                            }, 2000);

                        }, 1000);
                    }
                }
                emulator.add_listener("serial0-output-line", handleBoot);
            } else {
                emulator.add_listener("emulator-ready", function () {
                    console.log("emulator ready!");
                    updateFontSize();

                    setTimeout(() => {
                        emulator.serial0_send('\\!/etc/init.d/S40network restart\n');
                        emulator.serial0_send('psql -U postgres\n');
                        emulator.serial0_send('\\! echo "boot_completed"; reset\n');
                    }, 0);
                    setTimeout(() => {
                        (document.getElementById("terminal") as any).style = 'filter: none;';
                    }, 2000);
                });
            }
            emulator.clearState = async function () {
                await storage.delete('state-' + config.memory_size);
            }

            emulator.save = async function () {
                await emulator.clearState();
                const state = await emulator.save_state();
                const meta = {};
                const result = await storage.set('state-' + config.memory_size, state, meta);
                console.log('save result', result);
            }
            emulator.restore = async function () {
                console.log('restoring from indexedDB', 'state-' + config.memory_size);
                storage.get('state-' + config.memory_size).then(function (state) {
                    if (state) {
                        const byteLength = state.byteLength;
                        // format byteLength with commas
                        var size = byteLength.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        console.log('state is', size, 'bytes');
                        emulator.stop();
                        emulator.restore_state(state).then(function (result) {
                            console.log('restore result', result);
                            emulator.run();
                            emulator.serial_adapter.term.focus();
                            // console.log('emulator.restore calling restart_network');
                            // restart_network();
                        }).catch(function (err) {
                            console.log(err);
                        });
                    } else {
                        console.log('no state to restore');
                    }
                }).catch(function (err) {
                    console.log('restore error', err);
                });
            }

            var state;

            // document.getElementById("save_restore").onclick = async function () {
            //     var button = this;

            //     if (state) {
            //         button.value = "Save state";
            //         await emulator.restore_state(state);
            //         state = undefined;
            //     } else {
            //         const new_state = await emulator.save_state();
            //         console.log("Saved state of " + new_state.byteLength + " bytes");
            //         button.value = "Restore state";
            //         state = new_state;
            //     }

            //     button.blur();
            // };

            emulator.save_file = async () => {
                config.save_filename = document.getElementById("save_filename").value || "state.bin";
                console.log('config.save_filename', config.save_filename);
                const new_state = await emulator.save_state();
                var a = document.createElement("a");
                a.download = config.save_filename; //"v86state.bin";
                a.href = window.URL.createObjectURL(new Blob([new_state]));
                a.dataset.downloadurl = "application/octet-stream:" + a.download + ":" + a.href;
                a.click();

                this.blur();
                localStorage.setItem('config', JSON.stringify(config));

            };

            emulator.restore_file = () => {
                if (this.files.length) {
                    var filereader = new FileReader();
                    emulator.stop();

                    filereader.onload = async function (e) {
                        await emulator.restore_state(e.target.result);
                        emulator.run();
                    };

                    filereader.readAsArrayBuffer(this.files[0]);

                    this.value = "";
                }

                this.blur();
            };



            emulator.upload_files = (e) => {
                console.log('upload_files', e.target.files);
                async function getAsByteArray(file) {
                    return new Uint8Array(await readFile(file))
                }

                function readFile(file) {
                    return new Promise((resolve, reject) => {
                        // Create file reader
                        let reader = new FileReader()
                        // Register event listeners
                        reader.addEventListener("loadend", e => resolve(e.target.result))
                        reader.addEventListener("error", reject)
                        // Read file
                        reader.readAsArrayBuffer(file)
                    })
                }
                var files = e.target.files;
                for (var i = 0; i < files.length; i++) {
                    var reader = new FileReader();
                    reader.onload = function (file) {
                        return async function (e) {
                            const byteFile = await getAsByteArray(file);
                            emulator.create_file("/INBOX/" + file.name, byteFile);
                            console.log("uploaded " + file.name);
                        }
                    }(files[i]);
                    //reader.readAsText(files[i]);
                    reader.readAsArrayBuffer(files[i]);
                }
            }

            emulator.download_file = async () => {
                console.log('read_file_name', read_file_name)
                const path = read_file_name; //document.getElementById("read_file_name").value;
                const contents = await emulator.read_file(path);
                const filename = ('/' + path).split('/').pop();
                var a = document.createElement("a");
                a.download = filename;
                a.href = window.URL.createObjectURL(new Blob([contents]));
                // image/png
                // application/octet-stream
                a.dataset.downloadurl = "application/octet-stream:" + a.download + ":" + a.href;
                a.click();
                a.remove();
            }

        };

        function updateFontSize() {
            console.log('updateFontSize');
            return;
            console.log('emulator', emulator);
            console.log('emulator.serial_adapter', emulator.serial_adapter);
            console.log('FONT SIZE WAS', emulator.serial_adapter.term.options.fontSize);
            //emulator.screen_adapter.set_size_text(document.getElementById("font_size").value, document.getElementById("font_size").value);
            try {
                config.font_size = parseInt(document.getElementById("fontsize").value, 10) || 14;
                if (config.font_size < 4 || config.font_size > 90) {
                    config.font_size = 15;
                }
            } catch (err) {
                console.log('error parsing font size', err);
                config.font_size = 15;
            }
            emulator.serial_adapter.term.options.fontSize = config.font_size;
            if (emulator.serial_adapter.term.element && emulator.serial_adapter.term.element.children[0]) {
                //emulator.serial_adapter.term.element.children[0].style.width = 0;
                emulator.serial_adapter.term.element.children[0].style.backgroundColor = 'white';
                localStorage.setItem('config', JSON.stringify(config));
            } else {
                console.log('terminal not initialized, cannot update find size yet');
            }
        }

        function updateMemorySize() {
            const fullboot = document.getElementById("fullboot").checked;
            const newMemorySize = document.getElementById("memorysize").value;
            try {
                config.memory_size = parseInt(newMemorySize, 10) || 128;
                if (!config.memory_size || config.memory_size < 128) {
                    config.memory_size = 128;
                    document.getElementById("memorysize").value = config.memory_size;
                }
                localStorage.setItem('config', JSON.stringify(config));
                // get current url of window
                let url = "/home"; //window.location.origin;
                if (fullboot) {
                    url += '?boot=true';
                }
                window.location.href = url;
                // $goto("/home", { boot: fullboot });

                // window.location = url;
            } catch (e) {
                console.log('updateMemorySize error', e);
            }
        }
        
        function sendText() {

            emulator.add_listener("serial1-output-char", function(char)
            {
                console.log("outchar1", char);
            });

            const text = (document.getElementById("textarea") as any).value;
            // emulator.serial0_send(text);
            // net0-send
            console.log('emulator', emulator);
            console.log('emulator.bus', emulator.bus);
            //console.log('emulator.network_adapter', emulator.network_adapter.bus);
            console.log('sending text', text);
            // console.log('emulator.keyboard_send_text', emulator.keyboard_send_text);
            // emulator.keyboard_send_text(text);
            let arr = [];
            for (let x = 0; x < text.length; x++) {
                arr.push(text.charCodeAt(x));
            }
            emulator.bus.listeners["net0-send"](arr);

            // emulator.serial_send_bytes("1",arr);
            // emulator.bus.send("serial1-input", arr);

            // console.log("hello,world".charCodeAt(0))
            // document.getElementById("textarea").value = "";
        }
        const change_read_file = (e: any) => {
            console.log('change_read_file', e);
            read_file_name = e.detail.value;
        }

</script>
  
<IonPage {ionViewDidEnter}>
  <ion-header translucent="true">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-menu-button />
      </ion-buttons>
      <ion-title>HOME</ion-title>
    </ion-toolbar>
  </ion-header>
  
  <ion-content fullscreen="true">
    <div id="screen_container" style="display:none">
        <div></div>
        <canvas></canvas>
        <hr />
    </div>
    <div id="terminal" style="filter: blur(3px);"></div>
    <hr />
    <div style="clear: both;">
        <!-- <input id="save_restore" type="button" value="Save state"> -->
        <ion-button on:click={emulator.save_file}>
            Save state to file
        </ion-button>

        <ion-input style={'width: 160px;'} type="text" id="save_filename" value="state.bin" placeholder="enter filename"></ion-input>
        &nbsp;&nbsp;

        <ion-button on:click={emulator.restore_file}>
            Restore state from file
        </ion-button>
        <input type='file' id="restore_file" style="display:none">

        <br />
        <ion-button on:click={emulator.save}>
            Save to IndexedDB
        </ion-button>
        <ion-button on:click={emulator.restore}>
            Restore from IndexedDB
        </ion-button>
        <ion-button on:click={emulator.clearState}>
            Clear IndexedDB
        </ion-button>

        <br />
        <ion-input type="text" id="fontsize" value="15" min="4" max="40" style="width: 25px" />&nbsp;&nbsp;
        <ion-button
            on:click={updateFontSize}>
            Update font size
        </ion-button>
        <br />
        memory (mb): <ion-select interface="ion-popover" 
                    placeholder="memory size"
                    name="memorysize" 
                    id="memorysize" 
                    color="primary" bind={config.memory_size}>
            <ion-select-option value="128">128</ion-select-option>
            <ion-select-option value="196">196</ion-select-option>
            <ion-select-option value="256">256</ion-select-option>
            <ion-select-option value="384">384</ion-select-option>
            <ion-select-option value="512">512</ion-select-option>
            <ion-select-option value="1024">1024</ion-select-option>
        </ion-select>
        <!-- <input type="text" id="memorysize" value="96" min="96" max="8192" style="width: 35px">-->&nbsp;&nbsp;
        <ion-button
            on:click={updateMemorySize}>Reset</ion-button>
        &nbsp;&nbsp;<input type="checkbox" id="fullboot" name="fullboot" value="true"> Full Boot
        <br />
        <ion-button 
            on:click={emulator.upload_files}>
            Send files to emulator
        </ion-button>
        <input type='file' id="upload_files" style="display:none" multiple>

        &nbsp;&nbsp;


        <ion-button on:click={emulator.download_file}>
        Download file
        </ion-button>

        <ion-input type="text" 
        on:ionChange={change_read_file}
        id="read_file_name" 
        value="" placeholder="enter path to file"></ion-input>
        <!-- <br /><hr />
        <textarea id="textarea" cols="55" rows="10" style="width: 100%"></textarea><br>
        <button onclick="sendText()">Send Text</button> -->
    </div>
</ion-content>
</IonPage>
  <style>
    ion-menu-button {
      color: var(--ion-color-primary);
    }  
    ion-input {
        border: 1px solid;
    }
  </style>
  