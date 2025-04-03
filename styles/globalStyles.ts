import { appColor } from "../constants/appColors";
import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');

export const globalStyyles = StyleSheet.create({
    // Container styles
    container: {
        flex: 1,
        backgroundColor: appColor.while,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Navigation styles
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        height: 80,
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
    },
    tabButton: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContent: {
        alignItems: 'center',
    },
    qrButton: {
        position: 'absolute',
        top: -25,
        backgroundColor: appColor.primary || '#2196F3',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    tabText: {
        fontSize: 12,
        marginTop: 4,
    },

    // Text styles
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: appColor.black,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: appColor.text || '#333',
        marginBottom: 8,
    },
    bodyText: {
        fontSize: 14,
        color: appColor.text || '#666',
        lineHeight: 20,
    },

    // Button styles
    primaryButton: {
        backgroundColor: appColor.primary || '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: appColor.primary || '#2196F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: appColor.primary || '#2196F3',
        fontSize: 16,
        fontWeight: '600',
    },

    // Input styles
    input: {
        width: '100%',
        height: 48,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        color: appColor.text || '#333',
        backgroundColor: 'white',
    },
    inputLabel: {
        fontSize: 14,
        color: appColor.text || '#666',
        marginBottom: 8,
    },

    // Card styles
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },

    // Spacing
    padding: {
        padding: 16,
    },
    margin: {
        margin: 16,
    },
    paddingHorizontal: {
        paddingHorizontal: 16,
    },
    marginHorizontal: {
        marginHorizontal: 16,
    },
    paddingVertical: {
        paddingVertical: 16,
    },
    marginVertical: {
        marginVertical: 16,
    },
});