// Configuration file for Rosilo.
export default {
	Name: "Rosilo",
	Domain: "astrev.onrender.com", 
	DatabaseURL: "http://localhost:8000",
	RCCServiceProxyURL: "http://localhost:64990",
	OrbiterPrivateURL: "http://localhost:64991",
	OrbiterPublicDomain: "localhost:64992",
	LauncherURI: "rosilo-launcher:",
	CurrencySymbol: "R$", 
	Pages: ["Statistics", "Forum", "Groups"],

	// Purple/Space 'noob' colours
	DefaultBodyColors: {
		Head: 24,    // Grey
		LeftArm: 24, 
		LeftLeg: 1007, // Royal Purple
		RightArm: 24,
		RightLeg: 1007,
		Torso: 1007,
	},

	Logging: {
		Requests: true,
		FormattedErrors: false,
		Time: true,
	},

	Branding: {
		Favicon: "Branding/Favicon.png", // Changed to PNG
		Icon: "Branding/Icon.png",       // Changed to PNG
		Tagline: "The Galaxy of Creation",
		Descriptions: {
			"Endless Possibilities":
				"Rosilo is a vast creaative universe where you can create, play, and explore with friends.",
			"Servers we have":
				"Our  servers ensure a fast, secure, and stable experience for all players. *not garunteed",
			"Join the Community":
				"A social platform designed for creators",
		},
	},

	Images: {
		DefaultPlaceIcons: ["Images/DefaultIcon1.avif"],
		DefaultPlaceThumbnails: [
			"Images/DefaultThumbnail1.avif",
			"Images/DefaultThumbnail2.avif",
			"Images/DefaultThumbnail3.avif",
		],
	},

	Themes: [
		{
			Name: "Rosilo Space",
			Path: "Themes/Rosilo.css", 
		},
	],

	Filtering: {
		FilteredWords: [],
		ReplaceWith: "#",
		ReplaceType: "Character",
	},

	Registration: {
		Keys: {
			Enabled: true,
			Prefix: "rosilo-",
		},
		Emails: true,
	},

	Email: {
		Host: "smtp.example.com",
		Port: 587,
		Username: "username",
	},

	Gameservers: {
		Hosting: "Both",
	},
}
