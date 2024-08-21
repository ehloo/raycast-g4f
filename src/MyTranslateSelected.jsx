import { LaunchType, launchCommand, } from "@raycast/api";

export default function Command(props) {
    launchCommand({
        name: "myTranslate",
        type: LaunchType.UserInitiated,
        context: {
            name: "myTranslate",
            enableAutoLoadSelected: true,
        },
    });
}