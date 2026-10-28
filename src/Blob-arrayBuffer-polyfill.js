// Safari 13.1 supports FileReader but not Blob.arrayBuffer(), used by music-metadata.
if ( ! Blob.prototype.arrayBuffer ) {
	Blob.prototype.arrayBuffer = function() {
		return new Promise( ( resolve, reject ) => {
			const reader = new FileReader();
			reader.onload = () => resolve( reader.result );
			reader.onerror = () => reject( reader.error );
			reader.onabort = () => reject( new DOMException( 'Blob read aborted', 'AbortError' ) );
			reader.readAsArrayBuffer( this );
		});
	};
}
