// thanks https://github.com/aabuhijleh/override-getDisplayMedia

const { desktopCapturer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("myCustomGetDisplayMedia", async () => {
	const sources = await desktopCapturer.getSources({
		types: ["window", "screen"],
	});

	// you should create some kind of UI to prompt the user
	// to select the correct source like Google Chrome does
	const selectedSource = sources[0]; // this is just for testing purposes

	return selectedSource;
});